import rateLimit from 'express-rate-limit';

const base = { standardHeaders: 'draft-7', legacyHeaders: false };
const json = (message) => ({ success: false, message, code: 'RATE_LIMITED' });

// Broad protection for the whole API.
export const apiLimiter = rateLimit({ ...base, windowMs: 60 * 1000, limit: 300, message: json('Too many requests, slow down') });

// Strict limiter for credential endpoints (brute force protection).
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: json('Too many attempts. Try again in a few minutes.'),
});

// Per-user limiter for sending messages / uploads.
export const sendLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 90,
  keyGenerator: (req) => String(req.user?._id || 'anon'),
  message: json('You are sending messages too quickly'),
});
