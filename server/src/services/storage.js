import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env.js';

const SAFE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.heic', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg', '.m4a', '.pdf', '.zip', '.txt', '.csv', '.md', '.json', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']);
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

if (env.cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const kindOf = (mime = '') =>
  mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'file';

// Uploads a buffer to Cloudinary; in development without credentials it writes to ./uploads instead.
export async function uploadBuffer(file, { folder = 'files', transformation } = {}) {
  if (env.cloudinaryEnabled) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `cove/${folder}`, resource_type: 'auto', transformation, use_filename: false },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(file.buffer);
    });
    return { url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type };
  }

  if (env.isProd) throw new Error('Cloudinary is not configured');
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  // Only a safe allow-list of extensions is ever written, so a local upload can never be served as HTML/JS.
  const rawExt = path.extname(file.originalname || '').toLowerCase();
  const ext = SAFE_EXT.has(rawExt) ? rawExt : '.bin';
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), file.buffer);
  return { url: `${env.SERVER_URL}/uploads/${name}`, publicId: `local:${name}`, resourceType: 'raw' };
}

export async function deleteAsset(publicId, resourceType = 'image') {
  if (!publicId) return;
  try {
    if (publicId.startsWith('local:')) await fs.unlink(path.join(UPLOAD_DIR, publicId.slice(6)));
    else if (env.cloudinaryEnabled) await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn('asset delete failed', err.message);
  }
}
