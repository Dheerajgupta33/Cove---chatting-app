import { Server } from 'socket.io';
import crypto from 'crypto';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { addOnline, removeOnline, emitToConversation, emitToUser, isOnline, setIO } from '../services/realtime.js';
import { getSettings } from '../services/access.js';

// callId -> { a, b } participants. Keeps signalling events restricted to the two people in a call.
const calls = new Map();

/**
 * Rooms:
 *   user:<id>  - every socket of one user (notifications, friend events, calls)
 *   conv:<id>  - everyone in a conversation (messages, typing, receipts)
 *   admins     - moderators (new report alerts)
 */
export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
    pingTimeout: 30_000,
    maxHttpBufferSize: 1e6,
  });
  setIO(io);

  // Authenticate the handshake with the same access token used for REST.
  io.use(async (socket, next) => {
    try {
      const payload = verifyAccessToken(socket.handshake.auth?.token);
      const user = await User.findById(payload.sub).select('name username avatar role isBanned');
      if (!user || user.isBanned) return next(new Error('unauthorized'));
      socket.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => onConnection(io, socket));
  return io;
}

async function audienceRooms(uid) {
  const [convs, user] = await Promise.all([
    Conversation.find({ 'members.user': uid, type: { $ne: 'ai' } }).select('_id').lean(),
    User.findById(uid).select('friends').lean(),
  ]);
  return [...convs.map((c) => `conv:${c._id}`), ...(user?.friends || []).map((f) => `user:${f}`)];
}

async function broadcastPresence(io, uid, payload) {
  const rooms = await audienceRooms(uid);
  if (rooms.length) io.to(rooms).emit('presence:update', payload);
}

// Anything sent while the user was offline is now "delivered".
async function markDelivered(uid, convIds) {
  const since = new Date(Date.now() - 14 * 864e5);
  const pending = await Message.find({
    conversation: { $in: convIds }, sender: { $ne: uid }, 'deliveredTo.user': { $ne: uid }, isScheduled: false, createdAt: { $gte: since },
  }).select('_id conversation').limit(3000).lean();
  if (!pending.length) return;
  await Message.updateMany({ _id: { $in: pending.map((p) => p._id) } }, { $push: { deliveredTo: { user: uid, at: new Date() } } });
  [...new Set(pending.map((p) => String(p.conversation)))].forEach((cid) =>
    emitToConversation(cid, 'conversation:delivered', { conversationId: cid, userId: String(uid) })
  );
}

function onConnection(io, socket) {
  const user = socket.user;
  const uid = String(user._id);

  /* ---- Typing indicators (relay only; nothing is stored) ---- */
  socket.on('typing', ({ conversationId, isTyping } = {}) => {
    if (typeof conversationId !== 'string' || !socket.rooms.has(`conv:${conversationId}`)) return;
    socket.to(`conv:${conversationId}`).emit('typing', { conversationId, user: { _id: uid, name: user.name }, isTyping: !!isTyping });
  });

  /* ---- Call signalling (ring / accept / decline / end / opaque WebRTC payload relay) ---- */
  socket.on('call:invite', async ({ conversationId, type } = {}, ack) => {
    try {
      const conv = await Conversation.findOne({ _id: conversationId, type: 'direct', 'members.user': uid }).select('members').lean();
      const peer = conv?.members.map((m) => String(m.user)).find((id) => id !== uid);
      if (!peer) return ack?.({ ok: false, error: 'Calls are available in direct chats' });
      if (!isOnline(peer)) return ack?.({ ok: false, error: 'They are offline right now' });
      const callId = crypto.randomUUID();
      calls.set(callId, { a: uid, b: peer });
      setTimeout(() => calls.delete(callId), 2 * 60 * 60 * 1000).unref();
      emitToUser(peer, 'call:incoming', {
        callId, conversationId, type: type === 'video' ? 'video' : 'voice',
        from: { _id: uid, name: user.name, avatar: user.avatar },
      });
      ack?.({ ok: true, callId, peerId: peer });
    } catch {
      ack?.({ ok: false, error: 'Could not start the call' });
    }
  });

  const relay = (event, out) => ({ callId, data } = {}) => {
    const call = calls.get(callId);
    if (!call || (call.a !== uid && call.b !== uid)) return;
    emitToUser(call.a === uid ? call.b : call.a, out, { callId, data, from: uid });
    if (event === 'call:decline' || event === 'call:end') calls.delete(callId);
  };
  socket.on('call:accept', relay('call:accept', 'call:accepted'));
  socket.on('call:decline', relay('call:decline', 'call:declined'));
  socket.on('call:end', relay('call:end', 'call:ended'));
  socket.on('call:signal', relay('call:signal', 'call:signal'));

  /* ---- Presence ---- */
  socket.on('disconnect', () => {
    if (removeOnline(uid) > 0) return;
    // Grace period so page refreshes / flaky networks do not flash "offline".
    setTimeout(async () => {
      if (isOnline(uid)) return;
      try {
        const { privacy } = await getSettings(uid);
        const lastSeen = privacy.showLastSeen ? new Date() : undefined;
        await User.updateOne({ _id: uid }, { isOnline: false, ...(lastSeen && { lastSeen }) });
        broadcastPresence(io, uid, { userId: uid, isOnline: false, lastSeen });
      } catch (err) {
        console.error('presence offline failed', err.message);
      }
    }, 5000).unref();
  });

  // Async setup runs after handlers are attached so early client events are never lost.
  (async () => {
    try {
      socket.join(`user:${uid}`);
      if (user.role === 'admin') socket.join('admins');
      const convs = await Conversation.find({ 'members.user': uid }).select('_id').lean();
      socket.join(convs.map((c) => `conv:${c._id}`));

      if (addOnline(uid) === 1) {
        const { privacy } = await getSettings(uid);
        if (privacy.showOnline) {
          await User.updateOne({ _id: uid }, { isOnline: true });
          broadcastPresence(io, uid, { userId: uid, isOnline: true });
        }
      }
      await markDelivered(uid, convs.map((c) => c._id));
      socket.emit('ready', { userId: uid });
    } catch (err) {
      console.error('socket setup failed', err.message);
    }
  })();
}
