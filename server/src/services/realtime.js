// Thin registry around the Socket.IO server so controllers/services can emit without importing the server.
let io;
const online = new Map(); // userId -> open socket count (single instance; use the Redis adapter to scale out)

export const setIO = (instance) => { io = instance; };
export const getIO = () => io;

export const emitToConversation = (conversationId, event, payload) => io?.to(`conv:${conversationId}`).emit(event, payload);
export const emitToUser = (userId, event, payload) => io?.to(`user:${userId}`).emit(event, payload);
export const emitToAdmins = (event, payload) => io?.to('admins').emit(event, payload);

export const joinConversation = (userIds, conversationId) =>
  userIds.forEach((id) => io?.in(`user:${id}`).socketsJoin(`conv:${conversationId}`));
export const leaveConversation = (userIds, conversationId) =>
  userIds.forEach((id) => io?.in(`user:${id}`).socketsLeave(`conv:${conversationId}`));
export const disconnectUser = (userId) => io?.in(`user:${userId}`).disconnectSockets(true);

export const isOnline = (userId) => (online.get(String(userId)) || 0) > 0;
export const addOnline = (userId) => { const k = String(userId); online.set(k, (online.get(k) || 0) + 1); return online.get(k); };
export const removeOnline = (userId) => {
  const k = String(userId);
  const n = (online.get(k) || 1) - 1;
  if (n <= 0) online.delete(k); else online.set(k, n);
  return n;
};
export const onlineCount = () => online.size;
