// Notifications, reports and settings: small, self-contained resources.
import Notification from '../models/Notification.js';
import Report from '../models/Report.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { flatten } from '../utils/text.js';
import { getSettings } from '../services/access.js';
import { emitToAdmins } from '../services/realtime.js';
import { logAction } from '../services/logger.js';

/* ---------- Notifications ---------- */
export const listNotifications = asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(60).populate('from', 'name username avatar').lean(),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ notifications: items, unread });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ ok: true });
});
export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});
export const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ ok: true });
});
export const clearNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  res.json({ ok: true });
});

/* ---------- Reports ---------- */
export const createReport = asyncHandler(async (req, res) => {
  const { targetUser, targetMessage, reason, details } = req.body;
  let target = targetUser;
  if (targetMessage) {
    const msg = await Message.findById(targetMessage).select('sender');
    if (!msg) throw ApiError.notFound('Message not found');
    target = target || msg.sender;
  }
  if (String(target) === String(req.user._id)) throw ApiError.badRequest('You cannot report yourself');
  if (!(await User.exists({ _id: target }))) throw ApiError.notFound('User not found');

  const report = await Report.create({ reporter: req.user._id, targetUser: target, targetMessage, reason, details });
  emitToAdmins('admin:report', { reportId: report._id, reason });
  logAction({ actor: req.user._id, action: 'report.create', target: report._id, level: 'warn', message: `Reported (${reason})`, req });
  res.status(201).json({ message: 'Thanks - our team will review this report.' });
});

/* ---------- Settings ---------- */
export const getMySettings = asyncHandler(async (req, res) => res.json({ settings: await getSettings(req.user._id) }));

export const updateMySettings = asyncHandler(async (req, res) => {
  await getSettings(req.user._id);
  const settings = await Settings.findOneAndUpdate(
    { user: req.user._id },
    { $set: flatten(req.body) },
    { new: true }
  );
  res.json({ settings });
});
