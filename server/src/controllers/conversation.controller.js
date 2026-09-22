import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CONV_POPULATE, presentConversation } from '../services/serialize.js';
import { getConversationForUser, getSettings } from '../services/access.js';
import { emitToConversation, joinConversation } from '../services/realtime.js';
import { getBot } from '../services/ai.service.js';

const loadFull = (id) => Conversation.findById(id).populate(CONV_POPULATE);

export const listConversations = asyncHandler(async (req, res) => {
  const archived = req.query.archived === 'true';
  const convs = await Conversation.find({ members: { $elemMatch: { user: req.user._id, archived: archived ? true : { $ne: true } } } })
    .sort({ lastMessageAt: -1 })
    .limit(200)
    .populate(CONV_POPULATE);
  res.json({ conversations: convs.map((c) => presentConversation(c, req.user._id)) });
});

export const getConversation = asyncHandler(async (req, res) => {
  await getConversationForUser(req.params.id, req.user._id);
  res.json({ conversation: presentConversation(await loadFull(req.params.id), req.user._id) });
});

// Finds or creates the 1:1 conversation with another user.
export const openDirect = asyncHandler(async (req, res) => {
  const me = req.user;
  const { userId } = req.body;
  if (userId === String(me._id)) throw ApiError.badRequest('You cannot message yourself');
  const other = await User.findOne({ _id: userId, isBanned: false, isBot: false });
  if (!other) throw ApiError.notFound('User not found');
  if (other.blockedUsers.some((b) => String(b) === String(me._id)) || me.blockedUsers.some((b) => String(b) === userId)) {
    throw ApiError.forbidden('You cannot message this person');
  }

  const directKey = [String(me._id), userId].sort().join('_');
  let conv = await Conversation.findOne({ directKey });
  if (!conv) {
    try {
      conv = await Conversation.create({ type: 'direct', directKey, members: [{ user: me._id }, { user: userId }] });
    } catch (err) {
      if (err.code !== 11000) throw err; // two people opened the chat at the same moment
      conv = await Conversation.findOne({ directKey });
    }
    joinConversation([String(me._id), userId], conv._id);
  } else {
    // Re-opening should bring it back from the archive.
    await Conversation.updateOne({ _id: conv._id, 'members.user': me._id }, { $set: { 'members.$.archived': false } });
  }
  const full = await loadFull(conv._id);
  res.json({ conversation: presentConversation(full, me._id) });
});

export const openAi = asyncHandler(async (req, res) => {
  const bot = await getBot();
  const directKey = `ai_${req.user._id}`;
  let conv = await Conversation.findOne({ directKey });
  if (!conv) {
    conv = await Conversation.create({ type: 'ai', directKey, members: [{ user: req.user._id }, { user: bot._id }] });
    joinConversation([String(req.user._id)], conv._id);
  }
  res.json({ conversation: presentConversation(await loadFull(conv._id), req.user._id) });
});

export const setArchived = asyncHandler(async (req, res) => {
  await getConversationForUser(req.params.id, req.user._id);
  await Conversation.updateOne({ _id: req.params.id, 'members.user': req.user._id }, { $set: { 'members.$.archived': req.body.archived } });
  res.json({ archived: req.body.archived });
});

// Clears the unread badge and (if the user allows it) tells the sender their messages were seen.
export const markRead = asyncHandler(async (req, res) => {
  const conv = await getConversationForUser(req.params.id, req.user._id);
  const me = req.user._id;
  const now = new Date();
  await Conversation.updateOne({ _id: conv._id, 'members.user': me }, { $set: { 'members.$.unread': 0, 'members.$.lastReadAt': now } });

  const settings = await getSettings(me);
  if (settings.privacy.readReceipts) {
    const unseen = { conversation: conv._id, sender: { $ne: me }, 'readBy.user': { $ne: me }, isScheduled: false };
    await Message.updateMany({ ...unseen, 'deliveredTo.user': { $ne: me } }, { $push: { deliveredTo: { user: me, at: now } } });
    const { modifiedCount } = await Message.updateMany(unseen, { $push: { readBy: { user: me, at: now } } });
    if (modifiedCount) emitToConversation(conv._id, 'conversation:seen', { conversationId: String(conv._id), userId: String(me), at: now });
  }
  res.json({ ok: true });
});

export { loadFull };
