import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { kindOf, uploadBuffer } from '../services/storage.js';

// Uploads files first; the client then sends a message referencing the returned attachment objects.
export const uploadAttachments = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('No files received');
  const files = await Promise.all(
    req.files.map(async (f) => {
      const up = await uploadBuffer(f, { folder: 'attachments' });
      return { url: up.url, publicId: up.publicId, type: kindOf(f.mimetype), name: f.originalname.slice(0, 200), size: f.size, mimeType: f.mimetype.slice(0, 100) };
    })
  );
  res.status(201).json({ files });
});
