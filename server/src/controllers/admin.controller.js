import User, { USER_PUBLIC } from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Report from '../models/Report.js';
import SystemLog from '../models/SystemLog.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex } from '../utils/text.js';
import { MSG_POPULATE, presentMessage, CONV_POPULATE, presentConversation } from '../services/serialize.js';
import { disconnectUser, emitToConversation, onlineCount } from '../services/realtime.js';
import { logAction } from '../services/logger.js';
import { notify } from '../services/notify.js';

const idStr = (v) => String(v?._id ?? v);
const dayKey = (d) => d.toISOString().slice(0, 10);

// Fills gaps so charts always have one point per day.
function fillDays(rows, days) {
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getTime() - (days - 1 - i) * 864e5);
    return { date: dayKey(d), count: map[dayKey(d)] || 0 };
  });
}

/* ---------------- Analytics ---------------- */
export const stats = asyncHandler(async (_req, res) => {
  const DAYS = 14;
  const since = new Date(); since.setUTCHours(0, 0, 0, 0); since.setTime(since.getTime() - (DAYS - 1) * 864e5);
  const group = (field) => [{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }];

  const [users, banned, verified, messages, conversations, groups, openReports, signups, messagesPerDay, topSenders] = await Promise.all([
    User.countDocuments({ isBot: false }),
    User.countDocuments({ isBanned: true }),
    User.countDocuments({ isVerified: true, isBot: false }),
    Message.countDocuments({ isScheduled: false, type: { $ne: 'system' } }),
    Conversation.countDocuments(),
    Conversation.countDocuments({ type: 'group' }),
    Report.countDocuments({ status: { $in: ['open', 'reviewing'] } }),
    User.aggregate(group()),
    Message.aggregate([{ $match: { type: { $ne: 'system' }, isScheduled: false } }, ...group()]),
    User.find({ isBot: false }).sort({ 'activity.messagesSent': -1 }).limit(5).select('name username avatar activity.messagesSent').lean(),
  ]);

  res.json({
    totals: { users, banned, verified, messages, conversations, groups, openReports, online: onlineCount() },
    signups: fillDays(signups, DAYS),
    messagesPerDay: fillDays(messagesPerDay, DAYS),
    topSenders,
  });
});

/* ---------------- Users ---------------- */
export const listUsers = asyncHandler(async (req, res) => {
  const { q, status, page, limit } = req.query;
  const filter = { isBot: false };
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ name: rx }, { username: rx }, { email: rx }]; }
  if (status === 'banned') filter.isBanned = true;
  if (status === 'online') filter.isOnline = true;
  if (status === 'unverified') filter.isVerified = false;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select(`${USER_PUBLIC} email role isVerified isBanned banReason createdAt activity`).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ users, total, pages: Math.ceil(total / limit) });
});

export const banUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'admin') throw ApiError.forbidden('Admins cannot be banned');
  user.isBanned = true;
  user.banReason = req.body.reason;
  user.bannedAt = new Date();
  user.isOnline = false;
  user.refreshTokens = [];
  await user.save();
  disconnectUser(user._id); // kick live sockets immediately
  logAction({ actor: req.user._id, action: 'admin.ban', target: user._id, level: 'warn', message: `Banned @${user.username}${req.body.reason ? `: ${req.body.reason}` : ''}`, req });
  res.json({ ok: true });
});

export const unbanUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isBanned: false, banReason: '', bannedAt: null });
  if (!user) throw ApiError.notFound('User not found');
  logAction({ actor: req.user._id, action: 'admin.unban', target: user._id, message: `Unbanned @${user.username}`, req });
  res.json({ ok: true });
});

export const setRole = asyncHandler(async (req, res) => {
  if (idStr(req.params.id) === idStr(req.user._id)) throw ApiError.badRequest('You cannot change your own role');
  const user = await User.findOneAndUpdate({ _id: req.params.id, isBot: false }, { role: req.body.role });
  if (!user) throw ApiError.notFound('User not found');
  logAction({ actor: req.user._id, action: 'admin.role', target: user._id, level: 'warn', message: `Set @${user.username} to ${req.body.role}`, req });
  res.json({ ok: true });
});

/* ---------------- Chat monitoring (read-only, audited) ---------------- */
export const listConversations = asyncHandler(async (req, res) => {
  const { q, page } = req.query;
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ $or: [{ username: rx }, { name: rx }] }).select('_id').limit(50);
    filter['members.user'] = { $in: users.map((u) => u._id) };
  }
  const [convs, total] = await Promise.all([
    Conversation.find(filter).sort({ lastMessageAt: -1 }).skip((page - 1) * 15).limit(15).populate(CONV_POPULATE),
    Conversation.countDocuments(filter),
  ]);
  res.json({ conversations: convs.map((c) => presentConversation(c, null)), total, pages: Math.ceil(total / 15) });
});

export const conversationMessages = asyncHandler(async (req, res) => {
  const conv = await Conversation.findById(req.params.id);
  if (!conv) throw ApiError.notFound('Conversation not found');
  const filter = { conversation: conv._id, isScheduled: false };
  if (req.query.before) {
    const ref = await Message.findById(req.query.before).select('createdAt');
    if (ref) filter.$or = [{ createdAt: { $lt: ref.createdAt } }, { createdAt: ref.createdAt, _id: { $lt: ref._id } }];
  }
  const docs = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(41).populate(MSG_POPULATE);
  const hasMore = docs.length > 40;
  if (hasMore) docs.pop();
  logAction({ actor: req.user._id, action: 'admin.view_conversation', target: conv._id, level: 'warn', message: 'Viewed conversation content', req });
  res.json({ messages: docs.reverse().map((m) => presentMessage(m, null)), hasMore });
});

export const removeMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) throw ApiError.notFound('Message not found');
  Object.assign(message, { deletedForEveryone: true, text: '', attachments: [], poll: undefined, reactions: [], pinned: false, flagged: false });
  await message.save();
  emitToConversation(message.conversation, 'message:updated', {
    conversationId: String(message.conversation), messageId: String(message._id),
    patch: { deletedForEveryone: true, text: '', attachments: [], reactions: [], pinned: false, poll: null },
  });
  logAction({ actor: req.user._id, action: 'admin.remove_message', target: message._id, level: 'warn', message: `Removed message${req.body.reason ? `: ${req.body.reason}` : ''}`, req });
  res.json({ ok: true });
});

/* ---------------- Reports ---------------- */
export const listReports = asyncHandler(async (req, res) => {
  const filter = req.query.status === 'all' ? {} : { status: req.query.status };
  const reports = await Report.find(filter).sort({ createdAt: -1 }).limit(100)
    .populate('reporter', 'name username avatar').populate('targetUser', 'name username avatar isBanned')
    .populate({ path: 'targetMessage', select: 'text type attachments deletedForEveryone conversation' }).lean();
  res.json({ reports });
});

export const updateReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw ApiError.notFound('Report not found');
  const { status, note, action } = req.body;

  if (action === 'ban_user' && report.targetUser) {
    const target = await User.findById(report.targetUser);
    if (target && target.role !== 'admin') {
      Object.assign(target, { isBanned: true, banReason: `Report: ${report.reason}`, bannedAt: new Date(), isOnline: false, refreshTokens: [] });
      await target.save();
      disconnectUser(target._id);
    }
  }
  if (action === 'delete_message' && report.targetMessage) {
    await Message.updateOne({ _id: report.targetMessage }, { deletedForEveryone: true, text: '', attachments: [], reactions: [], pinned: false });
  }
  report.status = status;
  report.resolutionNote = note;
  if (['resolved', 'dismissed'].includes(status)) report.resolvedBy = req.user._id;
  await report.save();

  if (['resolved', 'dismissed'].includes(status)) {
    notify(report.reporter, { type: 'report', title: 'Your report was reviewed', body: status === 'resolved' ? 'We took action. Thank you for helping keep Cove safe.' : 'We found no violation this time.' }).catch(() => {});
  }
  logAction({ actor: req.user._id, action: 'admin.report', target: report._id, message: `Report ${status}${action !== 'none' ? ` (${action})` : ''}`, req });
  res.json({ ok: true });
});

/* ---------------- Moderation queue + logs ---------------- */
export const flaggedMessages = asyncHandler(async (_req, res) => {
  const docs = await Message.find({ flagged: true, deletedForEveryone: false }).sort({ createdAt: -1 }).limit(50).populate('sender', 'name username avatar').lean();
  res.json({ messages: docs.map((m) => ({ _id: m._id, text: m.text, sender: m.sender, conversation: m.conversation, createdAt: m.createdAt })) });
});

export const listLogs = asyncHandler(async (req, res) => {
  const { level, q, page } = req.query;
  const filter = {};
  if (level !== 'all') filter.level = level;
  if (q) filter.action = new RegExp(escapeRegex(q), 'i');
  const [logs, total] = await Promise.all([
    SystemLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 25).limit(25).populate('actor', 'name username').lean(),
    SystemLog.countDocuments(filter),
  ]);
  res.json({ logs, total, pages: Math.ceil(total / 25) });
});
