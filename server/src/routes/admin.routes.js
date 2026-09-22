import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import { validate } from '../middleware/validate.js';
import { admin as v } from '../validators/index.js';

// protect + adminOnly are applied where this router is mounted.
const router = Router();

router.get('/stats', c.stats);
router.get('/users', validate(v.users), c.listUsers);
router.post('/users/:id/ban', validate(v.ban), c.banUser);
router.post('/users/:id/unban', validate({ params: v.ban.params }), c.unbanUser);
router.patch('/users/:id/role', validate(v.role), c.setRole);
router.get('/conversations', validate(v.conversations), c.listConversations);
router.get('/conversations/:id/messages', validate(v.convMessages), c.conversationMessages);
router.delete('/messages/:id', validate(v.deleteMessage), c.removeMessage);
router.get('/reports', validate(v.reports), c.listReports);
router.patch('/reports/:id', validate(v.updateReport), c.updateReport);
router.get('/moderation', c.flaggedMessages);
router.get('/logs', validate(v.logs), c.listLogs);

export default router;
