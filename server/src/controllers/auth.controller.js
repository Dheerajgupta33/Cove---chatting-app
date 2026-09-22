import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import {
  REFRESH_COOKIE, hashToken, randomToken, refreshCookieOptions,
  signAccessToken, signRefreshToken, verifyRefreshToken,
} from '../utils/tokens.js';
import { logAction } from '../services/logger.js';
import { presentSelf } from '../services/serialize.js';

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;
const ROTATION_GRACE_MS = 10_000; // tolerate parallel refreshes (multiple tabs / StrictMode)
const clearCookie = (res) => res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });

// Creates a session: short-lived access token in the body, rotating refresh token in an httpOnly cookie.
async function issueSession(req, res, user, status = 200, { revokeOthers = false } = {}) {
  const refreshToken = signRefreshToken(user);
  const entry = {
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 864e5),
    userAgent: (req.headers['user-agent'] || '').slice(0, 160),
  };
  if (revokeOthers) await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
  await User.updateOne(
    { _id: user._id },
    {
      $push: { refreshTokens: { $each: [entry], $slice: -5 } }, // keep the 5 most recent devices
      $set: { 'activity.lastLoginAt': new Date() },
      $inc: { 'activity.loginCount': 1 },
    }
  );
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.status(status).json({ accessToken: signAccessToken(user), user: presentSelf(user) });
}

const uniqueUsername = async (seed) => {
  const base = (seed || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14) || 'user';
  for (let i = 0; i < 6; i++) {
    const candidate = `${base}${crypto.randomInt(100, 99999)}`.slice(0, 20);
    if (!(await User.exists({ username: candidate }))) return candidate;
  }
  return `${base}${Date.now()}`.slice(0, 20);
};

export const register = asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body;
  const taken = await User.findOne({ $or: [{ email }, { username }] }).select('email');
  if (taken) throw ApiError.conflict(taken.email === email ? 'That email is already registered' : 'That username is taken');

  const token = randomToken();
  const user = await User.create({
    name, username, email, password,
    emailVerifyToken: hashToken(token),
    emailVerifyExpires: new Date(Date.now() + 24 * 3600 * 1000),
  });
  await Settings.create({ user: user._id });
  sendVerificationEmail(user, token).catch((e) => console.error('verification email failed', e.message));
  logAction({ actor: user._id, action: 'auth.register', message: `${user.username} registered`, req });

  if (env.REQUIRE_EMAIL_VERIFICATION) {
    return res.status(201).json({ requiresVerification: true, message: 'Account created. Check your inbox to confirm your email.' });
  }
  await issueSession(req, res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+password');
  if (!user || user.isBot || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email/username or password', 'INVALID_CREDENTIALS');
  }
  if (user.isBanned) throw new ApiError(403, `Your account is suspended${user.banReason ? `: ${user.banReason}` : ''}`, 'BANNED');
  if (env.REQUIRE_EMAIL_VERIFICATION && !user.isVerified) {
    throw new ApiError(403, 'Please confirm your email before signing in', 'EMAIL_NOT_VERIFIED');
  }
  logAction({ actor: user._id, action: 'auth.login', message: 'Signed in', req });
  await issueSession(req, res, user);
});

export const google = asyncHandler(async (req, res) => {
  if (!googleClient) throw ApiError.badRequest('Google sign-in is not configured on this server');
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: req.body.credential, audience: env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized('Google sign-in failed', 'GOOGLE_INVALID');
  }
  if (!payload?.email || !payload.email_verified) throw ApiError.unauthorized('Your Google email is not verified', 'GOOGLE_UNVERIFIED');

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });
  if (!user) {
    user = await User.create({
      name: payload.name || email.split('@')[0],
      username: await uniqueUsername(email.split('@')[0]),
      email,
      googleId: payload.sub,
      isVerified: true,
      avatar: payload.picture ? { url: payload.picture } : undefined,
    });
    await Settings.create({ user: user._id });
    logAction({ actor: user._id, action: 'auth.register', message: 'Registered with Google', req });
  } else {
    if (user.isBanned) throw new ApiError(403, 'Your account is suspended', 'BANNED');
    if (!user.googleId) user.googleId = payload.sub; // link an existing email account
    user.isVerified = true;
    await user.save();
  }
  logAction({ actor: user._id, action: 'auth.login', message: 'Signed in with Google', req });
  await issueSession(req, res, user);
});

// Exchanges the refresh cookie for a new access token and rotates the refresh token.
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No active session', 'NO_REFRESH');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearCookie(res);
    throw ApiError.unauthorized('Session expired, please sign in again', 'REFRESH_INVALID');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  const now = Date.now();
  const hash = hashToken(token);
  const current = user?.refreshTokens.find((t) => t.tokenHash === hash);

  if (!user || user.isBanned || !current) {
    // A validly-signed token that is no longer stored means it was already used: assume theft, revoke everything.
    if (user) await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
    clearCookie(res);
    throw ApiError.unauthorized('Session revoked, please sign in again', 'REFRESH_REUSED');
  }
  if (current.rotatedAt && now - current.rotatedAt.getTime() > ROTATION_GRACE_MS) {
    await User.updateOne({ _id: user._id }, { $set: { refreshTokens: [] } });
    clearCookie(res);
    throw ApiError.unauthorized('Session revoked, please sign in again', 'REFRESH_REUSED');
  }

  const next = signRefreshToken(user);
  const kept = user.refreshTokens
    .filter((t) => t.expiresAt.getTime() > now && !(t.rotatedAt && now - t.rotatedAt.getTime() > ROTATION_GRACE_MS))
    .map((t) => (t.tokenHash === hash && !t.rotatedAt ? { ...t.toObject(), rotatedAt: new Date() } : t.toObject()));
  kept.push({ tokenHash: hashToken(next), expiresAt: new Date(now + env.REFRESH_TOKEN_DAYS * 864e5), userAgent: (req.headers['user-agent'] || '').slice(0, 160) });
  await User.updateOne({ _id: user._id }, { $set: { refreshTokens: kept.slice(-8) } });

  res.cookie(REFRESH_COOKIE, next, refreshCookieOptions());
  res.json({ accessToken: signAccessToken(user), user: presentSelf(user) });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const { sub } = verifyRefreshToken(token);
      await User.updateOne({ _id: sub }, { $pull: { refreshTokens: { tokenHash: hashToken(token) } } });
    } catch { /* already invalid - nothing to revoke */ }
  }
  clearCookie(res);
  res.json({ message: 'Signed out' });
});

export const me = asyncHandler(async (req, res) => res.json({ user: presentSelf(req.user) }));

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    emailVerifyToken: hashToken(req.body.token),
    emailVerifyExpires: { $gt: new Date() },
  }).select('+emailVerifyToken +emailVerifyExpires');
  if (!user) throw ApiError.badRequest('This confirmation link is invalid or has expired');
  user.isVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();
  res.json({ message: 'Email confirmed. You are all set!' });
});

export const resendVerification = asyncHandler(async (req, res) => {
  if (req.user.isVerified) return res.json({ message: 'Your email is already confirmed' });
  const token = randomToken();
  await User.updateOne({ _id: req.user._id }, { emailVerifyToken: hashToken(token), emailVerifyExpires: new Date(Date.now() + 24 * 3600 * 1000) });
  await sendVerificationEmail(req.user, token);
  res.json({ message: 'Confirmation email sent' });
});

// Always answers 200 so the endpoint cannot be used to discover which emails are registered.
export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email, isBot: false });
  if (user && !user.isBanned) {
    const token = randomToken();
    await User.updateOne({ _id: user._id }, { passwordResetToken: hashToken(token), passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000) });
    sendPasswordResetEmail(user, token).catch((e) => console.error('reset email failed', e.message));
    logAction({ actor: user._id, action: 'auth.forgot_password', message: 'Password reset requested', req });
  }
  res.json({ message: 'If that email is registered, a reset link is on its way.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: hashToken(req.body.token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires +refreshTokens');
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // sign out everywhere
  await user.save();
  logAction({ actor: user._id, action: 'auth.reset_password', level: 'warn', message: 'Password reset via email link', req });
  res.json({ message: 'Password updated. You can sign in now.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const { currentPassword, newPassword } = req.body;
  if (user.hasPassword) {
    if (!currentPassword || !(await user.comparePassword(currentPassword))) throw ApiError.badRequest('Your current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  logAction({ actor: user._id, action: 'auth.change_password', level: 'warn', message: 'Password changed', req });
  await issueSession(req, res, user, 200, { revokeOthers: true });
});
