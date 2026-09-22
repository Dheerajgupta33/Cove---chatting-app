import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { ApiError } from '../utils/ApiError.js';

// Loads a conversation and guarantees the user is a member.
export async function getConversationForUser(conversationId, userId) {
  const conv = await Conversation.findById(conversationId);
  if (!conv) throw ApiError.notFound('Conversation not found');
  if (!conv.members.some((m) => String(m.user) === String(userId))) throw ApiError.forbidden('You are not part of this conversation');
  return conv;
}

// Direct chats cannot be used when either side has blocked the other.
export async function assertCanMessage(conv, userId) {
  if (conv.type !== 'direct') return;
  const other = conv.members.find((m) => String(m.user) !== String(userId))?.user;
  const blocked = await User.exists({ $or: [{ _id: other, blockedUsers: userId }, { _id: userId, blockedUsers: other }] });
  if (blocked) throw ApiError.forbidden('You can no longer message this person');
}

export const getSettings = (userId) =>
  Settings.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId } }, { upsert: true, new: true, setDefaultsOnInsert: true });
