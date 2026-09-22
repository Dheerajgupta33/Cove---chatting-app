import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED = [
  /^image\/(jpeg|png|gif|webp|avif|heic)$/,
  /^video\//,
  /^audio\//,
  /^application\/(pdf|zip|json|msword|vnd\.ms-excel|vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\..+|x-zip-compressed)$/,
  /^text\/(plain|csv|markdown)$/,
];

const fileFilter = (_req, file, cb) =>
  ALLOWED.some((re) => re.test(file.mimetype)) ? cb(null, true) : cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));

// Files are buffered in memory then streamed to Cloudinary (or local disk in dev).
export const uploadFiles = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: 25 * 1024 * 1024, files: 10 } });

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype) ? cb(null, true) : cb(ApiError.badRequest('Avatar must be a JPG, PNG, WebP or GIF image'))),
});
