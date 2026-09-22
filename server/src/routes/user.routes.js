import { Router } from 'express';
import * as c from '../controllers/user.controller.js';
import { validate } from '../middleware/validate.js';
import { uploadAvatar } from '../middleware/upload.js';
import { users as v } from '../validators/index.js';

const router = Router();

// Static paths first so they are not captured by "/:id".
router.get('/search', validate(v.search), c.searchUsers);
router.get('/active', c.activeUsers);
router.get('/favorites', c.listFavorites);
router.get('/blocked', c.listBlocked);
router.get('/me/stats', c.myStats);
router.get('/me/activity', c.myActivity);
router.get('/me/backup', c.backup);
router.patch('/me', validate(v.update), c.updateMe);
router.patch('/me/avatar', uploadAvatar.single('avatar'), c.updateAvatar);

router.get('/:id', validate(v.id), c.getUser);
router.post('/:id/block', validate(v.id), c.blockUser);
router.delete('/:id/block', validate(v.id), c.unblockUser);
router.post('/:id/favorite', validate(v.id), c.toggleFavorite);

export default router;
