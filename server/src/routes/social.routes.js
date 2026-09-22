import { Router } from 'express';
import * as friends from '../controllers/friend.controller.js';
import * as s from '../controllers/social.controller.js';
import { validate } from '../middleware/validate.js';
import { chat, social as v, users } from '../validators/index.js';

const router = Router();

/* Friends */
router.get('/friends', friends.listFriends);
router.get('/friends/requests', friends.listRequests);
router.post('/friends/requests', validate(v.friendRequest), friends.sendRequest);
router.post('/friends/requests/:id/accept', validate(chat.id), friends.accept);
router.post('/friends/requests/:id/reject', validate(chat.id), friends.reject);
router.delete('/friends/requests/:id', validate(chat.id), friends.cancel);
router.delete('/friends/:id', validate(users.id), (req, _res, next) => { req.params.userId = req.params.id; next(); }, friends.unfriend);

/* Notifications */
router.get('/notifications', s.listNotifications);
router.post('/notifications/read-all', s.markAllNotificationsRead);
router.delete('/notifications', s.clearNotifications);
router.post('/notifications/:id/read', validate(chat.id), s.markNotificationRead);
router.delete('/notifications/:id', validate(chat.id), s.deleteNotification);

/* Reports + settings */
router.post('/reports', validate(v.report), s.createReport);
router.get('/settings', s.getMySettings);
router.patch('/settings', validate(v.settings), s.updateMySettings);

export default router;
