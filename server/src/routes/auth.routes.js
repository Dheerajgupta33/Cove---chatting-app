import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { auth as v } from '../validators/index.js';

const router = Router();

router.post('/register', authLimiter, validate(v.register), c.register);
router.post('/login', authLimiter, validate(v.login), c.login);
router.post('/google', authLimiter, validate(v.google), c.google);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);
router.post('/verify-email', authLimiter, validate(v.verifyEmail), c.verifyEmail);
router.post('/forgot-password', authLimiter, validate(v.forgot), c.forgotPassword);
router.post('/reset-password', authLimiter, validate(v.reset), c.resetPassword);

router.get('/me', protect, c.me);
router.post('/resend-verification', protect, authLimiter, c.resendVerification);
router.post('/change-password', protect, authLimiter, validate(v.changePassword), c.changePassword);

export default router;
