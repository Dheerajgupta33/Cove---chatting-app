import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokens.js';

// Requires a valid `Authorization: Bearer <accessToken>` header and loads the user.
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized('Missing access token', 'NO_TOKEN');

  let payload;
  try {
    payload = verifyAccessToken(header.slice(7));
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    throw ApiError.unauthorized(expired ? 'Access token expired' : 'Invalid access token', expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Account no longer exists', 'NO_USER');
  if (user.isBanned) throw new ApiError(403, 'Your account has been suspended', 'BANNED');

  req.user = user;
  next();
});

export const adminOnly = (req, _res, next) =>
  req.user?.role === 'admin' ? next() : next(ApiError.forbidden('Administrators only'));
