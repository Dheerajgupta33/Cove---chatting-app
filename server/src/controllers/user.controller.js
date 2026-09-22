import User, { USER_PUBLIC } from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import FriendRequest from '../models/FriendRequest.js';
import SystemLog from '../models/SystemLog.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex } from '../utils/text.js';
import { uploadBuffer, deleteAsset } from '../services/storage.js';
import { presentSelf } from '../services/serialize.js';
import { logAction } from '../services/logger.js';

const idStr = (v) => String(v?._id ?? v);

// Describes how the viewer relates to each user in `users` (friend / pending request / none).
async function withRelationship(me, users) {
  const ids = users.map((u) => u._id);
  const pending = await FriendRequest.find({
    status: 'pending',
    $or: [{ from: me._id, to: { $in: ids } }, { to: me._id, from: { $in: ids } }],
  }).lean();
  const friends = new Set(me.friends.map(String));
  const favorites = new Set(me.favorites.map(String));
  return users.map((u) => {
    const id = String(u._id);
    const req = pending.find((p) => String(p.from) === id || String(p.to) === id);
    let relationship = 'none';
    if (friends.has(id)) relationship = 'friend';
    else if (req) relationship = String(req.from) === String(me._id) ? 'pending_sent' : 'pending_received';
    return { ...u, relationship, requestId: req?._id, isFavorite: favorites.has(id) };
  });
}

export const searchUsers = asyncHandler(async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ users: [] });
  const rx = new RegExp(escapeRegex(q), 'i');
  const users = await User.find({
    _id: { $ne: req.user._id, $nin: req.user.blockedUsers },
    blockedUsers: { $ne: req.user._id },
    isBanned: false,
    isBot: false,
    $or: [{ username: rx }, { name: rx }],
  }).select(USER_PUBLIC).limit(20).lean();
  res.json({ users: await withRelationship(req.user, users) });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isBanned: false }).select(USER_PUBLIC).lean();
  if (!user) throw ApiError.notFound('User not found');
  const [withRel] = await withRelationship(req.user, [user]);
  res.json({ user: { ...withRel, isBlocked: req.user.blockedUsers.some((b) => idStr(b) === idStr(user._id)) } });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (username && username !== req.user.username && (await User.exists({ username, _id: { $ne: req.user._id } }))) {
    throw ApiError.conflict('That username is taken');
  }
  Object.assign(req.user, req.body);
  await req.user.save();
  logAction({ actor: req.user._id, action: 'profile.update', message: 'Updated profile', req });
  res.json({ user: presentSelf(req.user) });
});

export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');
  const uploaded = await uploadBuffer(req.file, {
    folder: 'avatars',
    transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
  });
  const oldId = req.user.avatar?.publicId;
  req.user.avatar = { url: uploaded.url, publicId: uploaded.publicId };
  await req.user.save();
  if (oldId) deleteAsset(oldId);
  logAction({ actor: req.user._id, action: 'profile.avatar', message: 'Updated avatar', req });
  res.json({ user: presentSelf(req.user) });
});

export const activeUsers = asyncHandler(async (req, res) => {
  const me = req.user;
  const convs = await Conversation.find({ 'members.user': me._id, type: 'direct' }).select('members.user').lean();
  const ids = new Set([...me.friends.map(String), ...convs.flatMap((c) => c.members.map((m) => String(m.user)))]);
  ids.delete(String(me._id));
  me.blockedUsers.forEach((b) => ids.delete(String(b)));
  const users = await User.find({ _id: { $in: [...ids] }, isOnline: true, isBot: false, isBanned: false }).select(USER_PUBLIC).limit(30).lean();
  res.json({ users });
});

export const listFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('favorites', USER_PUBLIC);
  res.json({ users: user.favorites.filter(Boolean) });
});

export const toggleFavorite = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await User.exists({ _id: id }))) throw ApiError.notFound('User not found');
  const has = req.user.favorites.some((f) => String(f) === id);
  await User.updateOne({ _id: req.user._id }, has ? { $pull: { favorites: id } } : { $addToSet: { favorites: id } });
  res.json({ isFavorite: !has });
});

export const listBlocked = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('blockedUsers', USER_PUBLIC);
  res.json({ users: user.blockedUsers.filter(Boolean) });
});

export const blockUser = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (id === String(req.user._id)) throw ApiError.badRequest('You cannot block yourself');
  if (!(await User.exists({ _id: id, isBot: false }))) throw ApiError.notFound('User not found');
  await User.updateOne({ _id: req.user._id }, { $addToSet: { blockedUsers: id }, $pull: { friends: id, favorites: id } });
  await User.updateOne({ _id: id }, { $pull: { friends: req.user._id, favorites: req.user._id } });
  await FriendRequest.deleteMany({ $or: [{ from: req.user._id, to: id }, { from: id, to: req.user._id }] });
  logAction({ actor: req.user._id, action: 'user.block', target: id, message: 'Blocked a user', req });
  res.json({ blocked: true });
});

export const unblockUser = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { blockedUsers: req.params.id } });
  res.json({ blocked: false });
});

const dayKey = (d) => d.toISOString().slice(0, 10);

// Numbers for the dashboard: totals + messages sent per day for the last 7 days.
export const myStats = asyncHandler(async (req, res) => {
  const me = req.user;
  const startToday = new Date(); startToday.setUTCHours(0, 0, 0, 0);
  const since = new Date(startToday.getTime() - 6 * 864e5);
  const convs = await Conversation.find({ 'members.user': me._id }).select('type').lean();
  const convIds = convs.map((c) => c._id);

  const [byDay, receivedToday, sentToday, media] = await Promise.all([
    Message.aggregate([
      { $match: { sender: me._id, createdAt: { $gte: since }, isScheduled: false, type: { $ne: 'system' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    Message.countDocuments({ conversation: { $in: convIds }, sender: { $ne: me._id }, createdAt: { $gte: startToday }, isScheduled: false, type: { $ne: 'system' } }),
    Message.countDocuments({ sender: me._id, createdAt: { $gte: startToday }, isScheduled: false, type: { $ne: 'system' } }),
    Message.countDocuments({ sender: me._id, 'attachments.0': { $exists: true } }),
  ]);
  const counts = Object.fromEntries(byDay.map((d) => [d._id, d.count]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since.getTime() + i * 864e5);
    return { date: dayKey(d), count: counts[dayKey(d)] || 0 };
  });

  res.json({
    stats: {
      messagesSent: me.activity?.messagesSent || 0,
      sentToday,
      receivedToday,
      conversations: convs.length,
      groups: convs.filter((c) => c.type === 'group').length,
      friends: me.friends.length,
      mediaShared: media,
      days,
    },
  });
});

export const myActivity = asyncHandler(async (req, res) => {
  const [logs, user] = await Promise.all([
    SystemLog.find({ actor: req.user._id }).sort({ createdAt: -1 }).limit(20).select('action message createdAt ip').lean(),
    User.findById(req.user._id).select('activity createdAt').lean(),
  ]);
  res.json({ logs, activity: user.activity, joinedAt: user.createdAt });
});

// Chat backup: downloads every conversation you are in as one JSON file (max 5000 latest messages per chat).
export const backup = asyncHandler(async (req, res) => {
  const convs = await Conversation.find({ 'members.user': req.user._id }).populate('members.user', 'name username').populate('group', 'name').lean();
  const chats = [];
  for (const c of convs) {
    const messages = await Message.find({ conversation: c._id, isScheduled: false, deletedFor: { $ne: req.user._id }, type: { $ne: 'system' } })
      .sort({ createdAt: -1 }).limit(5000).populate('sender', 'name username').lean();
    chats.push({
      id: c._id,
      type: c.type,
      title: c.group?.name || c.members.filter((m) => idStr(m.user) !== idStr(req.user._id)).map((m) => m.user.name).join(', '),
      participants: c.members.map((m) => ({ name: m.user.name, username: m.user.username })),
      messages: messages.reverse().map((m) => ({
        at: m.createdAt, from: m.sender?.username, text: m.deletedForEveryone ? null : m.text, type: m.type,
        attachments: (m.attachments || []).map((a) => ({ name: a.name, url: a.url })), edited: m.edited,
      })),
    });
  }
  logAction({ actor: req.user._id, action: 'backup.export', message: `Exported ${chats.length} chats`, req });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="cove-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify({ exportedAt: new Date(), user: { name: req.user.name, username: req.user.username }, chats }, null, 2));
});
