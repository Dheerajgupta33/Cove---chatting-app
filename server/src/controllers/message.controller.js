import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex, extractHashtags, extractMentions } from '../utils/text.js';
import { moderateText } from '../utils/moderation.js';
import { MSG_POPULATE, presentMessage } from '../services/serialize.js';
import { assertCanMessage, getConversationForUser } from '../services/access.js';
import { publishMessage } from '../services/message.service.js';
import { maybeReplyWithAI } from '../services/ai.service.js';
import { emitToConversation } from '../services/realtime.js';
import { logAction } from '../services/logger.js';

const idStr = (v) => String(v?._id ?? v);
const patchEvent = (conversationId, messageId, patch) => emitToConversation(conversationId, 'message:updated', { conversationId: String(conversationId), messageId: String(messageId), patch });

// Loads a message the user is allowed to see (member of its conversation).
async function loadMessageForMember(id, userId) {
  const message = await Message.findById(id);
  if (!message) throw ApiError.notFound('Message not found');
  const conv = await getConversationForUser(message.conversation, userId);
  return { message, conv };
}

async function resolveMentions(text, conv, meId) {
  const names = extractMentions(text);
  if (!names.length) return [];
  const memberIds = conv.members.map((m) => m.user);
  const users = await User.find({ username: { $in: names }, _id: { $in: memberIds, $ne: meId } }).select('_id');
  return users.map((u) => u._id);
}

/* ---------------- History (cursor pagination, newest last) ---------------- */
export const getMessages = asyncHandler(async (req, res) => {
  const conv = await getConversationForUser(req.params.id, req.user._id);
  const { before, limit } = req.query;
  const filter = { conversation: conv._id, isScheduled: false, deletedFor: { $ne: req.user._id } };
  if (before) {
    const ref = await Message.findById(before).select('createdAt');
    if (ref) filter.$or = [{ createdAt: { $lt: ref.createdAt } }, { createdAt: ref.createdAt, _id: { $lt: ref._id } }];
  }
  const docs = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).populate(MSG_POPULATE);
  const hasMore = docs.length > limit;
  if (hasMore) docs.pop();
  res.json({ messages: docs.reverse().map((m) => presentMessage(m, req.user._id)), hasMore });
});

export const getPinned = asyncHandler(async (req, res) => {
  await getConversationForUser(req.params.id, req.user._id);
  const docs = await Message.find({ conversation: req.params.id, pinned: true, deletedForEveryone: false, deletedFor: { $ne: req.user._id } })
    .sort({ pinnedAt: -1 }).limit(50).populate(MSG_POPULATE);
  res.json({ messages: docs.map((m) => presentMessage(m, req.user._id)) });
});

export const getMedia = asyncHandler(async (req, res) => {
  await getConversationForUser(req.params.id, req.user._id);
  const types = req.query.kind === 'media' ? ['image', 'video'] : ['file', 'audio'];
  const docs = await Message.find({ conversation: req.params.id, isScheduled: false, deletedForEveryone: false, deletedFor: { $ne: req.user._id }, 'attachments.type': { $in: types } })
    .sort({ createdAt: -1 }).limit(60).select('attachments sender createdAt').populate('sender', 'name').lean();
  const items = docs.flatMap((m) => m.attachments.filter((a) => types.includes(a.type)).map((a) => ({ ...a, messageId: m._id, createdAt: m.createdAt, sender: m.sender })));
  res.json({ items });
});

/* ---------------- Send ---------------- */
export const sendMessage = asyncHandler(async (req, res) => {
  const me = req.user;
  const conv = await getConversationForUser(req.params.id, me._id);
  await assertCanMessage(conv, me._id);
  const { text, attachments, poll, replyTo, clientId, scheduledFor } = req.body;

  if (replyTo && !(await Message.exists({ _id: replyTo, conversation: conv._id }))) throw ApiError.badRequest('The message you replied to no longer exists');
  if (scheduledFor) {
    if (conv.type === 'ai') throw ApiError.badRequest('Scheduling is not available in the AI chat');
    if (scheduledFor.getTime() < Date.now() + 10_000) throw ApiError.badRequest('Pick a time in the future');
    if (scheduledFor.getTime() > Date.now() + 365 * 864e5) throw ApiError.badRequest('Messages can be scheduled up to a year ahead');
  }

  const { text: cleaned, flagged } = moderateText(text);
  const message = await Message.create({
    conversation: conv._id,
    sender: me._id,
    clientId,
    type: poll ? 'poll' : attachments.length ? attachments[0].type : 'text',
    text: cleaned,
    attachments,
    replyTo,
    mentions: await resolveMentions(cleaned, conv, me._id),
    hashtags: extractHashtags(cleaned),
    flagged,
    poll: poll && { question: poll.question, multiple: poll.multiple, options: poll.options.map((t) => ({ text: t, votes: [] })) },
    ...(scheduledFor && { isScheduled: true, scheduledFor }),
  });

  if (flagged) logAction({ actor: me._id, action: 'moderation.flag', target: message._id, level: 'warn', message: 'Message hit the word filter', req });
  if (message.isScheduled) return res.status(201).json({ message: presentMessage(message, me._id), scheduled: true });

  const payload = await publishMessage(message, conv);
  res.status(201).json({ message: payload });
  maybeReplyWithAI(conv).catch((e) => console.error('ai reply failed', e.message));
});

/* ---------------- Edit / delete ---------------- */
export const editMessage = asyncHandler(async (req, res) => {
  const { message, conv } = await loadMessageForMember(req.params.id, req.user._id);
  if (idStr(message.sender) !== idStr(req.user._id)) throw ApiError.forbidden('You can only edit your own messages');
  if (message.deletedForEveryone || message.type === 'poll' || message.type === 'system') throw ApiError.badRequest('This message cannot be edited');

  const { text, flagged } = moderateText(req.body.text);
  message.text = text;
  message.edited = true;
  message.editedAt = new Date();
  message.hashtags = extractHashtags(text);
  message.flagged = message.flagged || flagged;
  await message.save();
  patchEvent(conv._id, message._id, { text, edited: true, editedAt: message.editedAt, hashtags: message.hashtags });
  res.json({ ok: true });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { message, conv } = await loadMessageForMember(req.params.id, req.user._id);
  const mine = idStr(message.sender) === idStr(req.user._id);

  if (req.query.scope === 'everyone') {
    if (!mine) throw ApiError.forbidden('You can only delete your own messages for everyone');
    if (message.isScheduled) { await message.deleteOne(); return res.json({ ok: true }); }
    Object.assign(message, { deletedForEveryone: true, text: '', attachments: [], poll: undefined, reactions: [], pinned: false });
    await message.save();
    patchEvent(conv._id, message._id, { deletedForEveryone: true, text: '', attachments: [], reactions: [], pinned: false, poll: null });
  } else {
    await Message.updateOne({ _id: message._id }, { $addToSet: { deletedFor: req.user._id } });
  }
  res.json({ ok: true });
});

/* ---------------- Reactions, pin, star ---------------- */
export const toggleReaction = asyncHandler(async (req, res) => {
  const { message, conv } = await loadMessageForMember(req.params.id, req.user._id);
  if (message.deletedForEveryone) throw ApiError.badRequest('This message was deleted');
  const { emoji } = req.body;
  const idx = message.reactions.findIndex((r) => idStr(r.user) === idStr(req.user._id) && r.emoji === emoji);
  if (idx >= 0) message.reactions.splice(idx, 1);
  else message.reactions.push({ user: req.user._id, emoji });
  await message.save();
  patchEvent(conv._id, message._id, { reactions: message.reactions });
  res.json({ reactions: message.reactions });
});

export const togglePin = asyncHandler(async (req, res) => {
  const { message, conv } = await loadMessageForMember(req.params.id, req.user._id);
  if (message.deletedForEveryone || message.type === 'system') throw ApiError.badRequest('This message cannot be pinned');
  message.pinned = !message.pinned;
  message.pinnedBy = message.pinned ? req.user._id : undefined;
  message.pinnedAt = message.pinned ? new Date() : undefined;
  await message.save();
  patchEvent(conv._id, message._id, { pinned: message.pinned, pinnedAt: message.pinnedAt });
  res.json({ pinned: message.pinned });
});

export const toggleStar = asyncHandler(async (req, res) => {
  const { message } = await loadMessageForMember(req.params.id, req.user._id);
  const has = message.starredBy.some((u) => idStr(u) === idStr(req.user._id));
  await Message.updateOne({ _id: message._id }, has ? { $pull: { starredBy: req.user._id } } : { $addToSet: { starredBy: req.user._id } });
  res.json({ starred: !has });
});

/* ---------------- Forward ---------------- */
export const forwardMessage = asyncHandler(async (req, res) => {
  const { message: original } = await loadMessageForMember(req.params.id, req.user._id);
  if (original.deletedForEveryone || original.type === 'system') throw ApiError.badRequest('This message cannot be forwarded');

  let sent = 0;
  for (const conversationId of req.body.conversationIds) {
    const conv = await getConversationForUser(conversationId, req.user._id).catch(() => null);
    if (!conv) continue;
    try { await assertCanMessage(conv, req.user._id); } catch { continue; }
    const copy = await Message.create({
      conversation: conv._id,
      sender: req.user._id,
      type: original.type === 'poll' ? 'text' : original.type,
      text: original.type === 'poll' ? `📊 ${original.poll.question}` : original.text,
      attachments: original.attachments,
      hashtags: original.hashtags,
      forwardedFrom: original.forwardedFrom || original.sender,
    });
    await publishMessage(copy, conv);
    sent += 1;
  }
  res.json({ forwarded: sent });
});

/* ---------------- Polls ---------------- */
export const votePoll = asyncHandler(async (req, res) => {
  const { message, conv } = await loadMessageForMember(req.params.id, req.user._id);
  if (message.type !== 'poll' || message.deletedForEveryone) throw ApiError.badRequest('This is not a poll');
  const option = message.poll.options[req.body.optionIndex];
  if (!option) throw ApiError.badRequest('Unknown option');

  const me = idStr(req.user._id);
  const already = option.votes.some((v) => idStr(v) === me);
  if (!message.poll.multiple) message.poll.options.forEach((o) => { o.votes = o.votes.filter((v) => idStr(v) !== me); });
  if (already) option.votes = option.votes.filter((v) => idStr(v) !== me);
  else option.votes.push(req.user._id);
  message.markModified('poll');
  await message.save();
  patchEvent(conv._id, message._id, { poll: message.poll });
  res.json({ poll: message.poll });
});

/* ---------------- Search / starred / scheduled ---------------- */
async function toResults(docs) {
  const convIds = [...new Set(docs.map((m) => idStr(m.conversation)))];
  const convs = await Conversation.find({ _id: { $in: convIds } }).populate('group', 'name').populate('members.user', 'name').lean();
  const titles = Object.fromEntries(convs.map((c) => [String(c._id), c]));
  return docs.map((m) => {
    const c = titles[idStr(m.conversation)];
    const title = !c ? 'Conversation' : c.type === 'group' ? c.group?.name : c.type === 'ai' ? 'Cove AI' : c.members.map((x) => x.user?.name).filter((n) => n && n !== m.sender?.name).join(', ') || m.sender?.name;
    return { _id: m._id, text: m.text, type: m.type, attachments: m.attachments?.slice(0, 1), createdAt: m.createdAt, scheduledFor: m.scheduledFor, sender: m.sender, conversation: idStr(m.conversation), conversationTitle: title, conversationType: c?.type };
  });
}

export const searchMessages = asyncHandler(async (req, res) => {
  const { q, conversationId } = req.query;
  const mine = await Conversation.find({ 'members.user': req.user._id }).select('_id').lean();
  const allowed = mine.map((c) => String(c._id));
  if (conversationId && !allowed.includes(conversationId)) throw ApiError.forbidden('You are not part of this conversation');

  const filter = {
    conversation: conversationId || { $in: allowed },
    isScheduled: false, deletedForEveryone: false, deletedFor: { $ne: req.user._id }, type: { $ne: 'system' },
  };
  if (q.startsWith('#')) filter.hashtags = q.slice(1).toLowerCase();
  else filter.text = new RegExp(escapeRegex(q), 'i');

  const docs = await Message.find(filter).sort({ createdAt: -1 }).limit(30).populate('sender', 'name username avatar').lean();
  res.json({ results: await toResults(docs) });
});

export const starredMessages = asyncHandler(async (req, res) => {
  const docs = await Message.find({ starredBy: req.user._id, deletedForEveryone: false }).sort({ createdAt: -1 }).limit(100).populate('sender', 'name username avatar').lean();
  res.json({ results: await toResults(docs) });
});

export const scheduledMessages = asyncHandler(async (req, res) => {
  const docs = await Message.find({ sender: req.user._id, isScheduled: true }).sort({ scheduledFor: 1 }).limit(100).populate('sender', 'name username avatar').lean();
  res.json({ results: await toResults(docs) });
});
