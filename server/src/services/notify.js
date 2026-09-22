import Notification from '../models/Notification.js';
import { emitToUser } from './realtime.js';

// Persists a notification and pushes it to the user's open sockets.
export async function notify(userId, { type, title, body = '', from, conversation }) {
  const n = await Notification.create({ user: userId, type, title, body, from, conversation });
  const populated = await n.populate('from', 'name username avatar');
  emitToUser(userId, 'notification:new', populated.toObject());
  return populated;
}
