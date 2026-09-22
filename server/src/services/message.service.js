import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { emitToConversation, isOnline } from './realtime.js';
import { MSG_POPULATE, presentMessage } from './serialize.js';
import { notify } from './notify.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id?._id ?? id));

/**
 * Everything that must happen once a message becomes visible:
 * conversation preview + unread counters, delivery receipts for online users,
 * the realtime broadcast and mention notifications.
 * Used by: REST send, forward, scheduled-message worker, AI replies and system messages.
 */
export async function publishMessage(message, conversation, { silent = false } = {}) {
  const senderId = String(message.sender?._id ?? message.sender);
  const others = conversation.members.map((m) => String(m.user?._id ?? m.user)).filter((id) => id !== senderId);

  // 1) Conversation preview, ordering and per-member unread counters.
  const update = { $set: { lastMessage: message._id, lastMessageAt: message.createdAt } };
  const ops = [];
  if (!silent && others.length) {
    ops.push(
      Conversation.updateOne(
        { _id: conversation._id },
        { ...update, $set: { ...update.$set, 'members.$[o].archived': false }, $inc: { 'members.$[o].unread': 1 } },
        { arrayFilters: [{ 'o.user': { $in: others.map(oid) } }] }
      )
    );
  } else {
    ops.push(Conversation.updateOne({ _id: conversation._id }, update));
  }
  // Sending into an archived chat brings it back for the sender.
  ops.push(Conversation.updateOne({ _id: conversation._id, 'members.user': oid(senderId) }, { $set: { 'members.$.archived': false } }));
  await Promise.all(ops);

  // 2) Mark as delivered for everyone currently connected.
  const deliveredNow = others.filter(isOnline);
  if (deliveredNow.length) {
    const at = new Date();
    const deliveredTo = deliveredNow.map((user) => ({ user, at }));
    await Message.updateOne({ _id: message._id }, { $push: { deliveredTo: { $each: deliveredTo } } });
    message.deliveredTo = [...(message.deliveredTo || []), ...deliveredTo];
  }

  // 3) Realtime broadcast to everyone in the conversation room.
  await message.populate(MSG_POPULATE);
  const payload = presentMessage(message, null);
  emitToConversation(conversation._id, 'message:new', { message: payload });

  // 4) Side effects.
  if (!silent) {
    User.updateOne({ _id: senderId }, { $inc: { 'activity.messagesSent': 1 } }).catch(() => {});
    const sender = message.sender;
    for (const uid of (message.mentions || []).map(String)) {
      if (uid === senderId) continue;
      notify(uid, {
        type: 'mention',
        title: `${sender.name} mentioned you`,
        body: (message.text || '').slice(0, 120),
        from: senderId,
        conversation: conversation._id,
      }).catch(() => {});
    }
  }
  return payload;
}

// Posts a centred "X created the group" style line.
export async function createSystemMessage(conversation, actorId, text) {
  const message = await Message.create({ conversation: conversation._id, sender: actorId, type: 'system', text });
  return publishMessage(message, conversation, { silent: true });
}
