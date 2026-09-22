import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import userRoutes from './user.routes.js';
import chatRoutes from './chat.routes.js';
import socialRoutes from './social.routes.js';
import adminRoutes from './admin.routes.js';

// Everything here requires a signed-in user. /api/auth is mounted separately in app.js.
const router = Router();
router.use(protect);
router.use('/users', userRoutes);
router.use('/admin', adminOnly, adminRoutes);
router.use('/', chatRoutes);
router.use('/', socialRoutes);

export default router;
