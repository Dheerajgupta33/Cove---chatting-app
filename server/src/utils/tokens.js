import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_EXPIRES });

// `jti` makes every refresh token unique so rotation/reuse detection works.
export const signRefreshToken = (user) =>
  jwt.sign({ sub: String(user._id), jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_DAYS}d`,
  });

export const verifyAccessToken = (t) => jwt.verify(t, env.JWT_ACCESS_SECRET);
export const verifyRefreshToken = (t) => jwt.verify(t, env.JWT_REFRESH_SECRET);

// Only hashes are stored in the DB so a DB leak cannot be replayed.
export const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('hex');

export const REFRESH_COOKIE = 'cove_rt';

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.COOKIE_SAMESITE || (env.isProd ? 'none' : 'lax'),
  path: '/api/auth',
  maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
});
