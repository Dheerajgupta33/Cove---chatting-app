import { z } from 'zod';
import { env } from '../config/env.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password needs a letter')
  .regex(/\d/, 'Password needs a number');
const username = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, 'Username: 3-20 letters, numbers or underscores');
const email = z.string().trim().toLowerCase().email('Enter a valid email');

// Only accept attachment URLs that came from our own upload pipeline.
const trustedUrl = (u) => u.startsWith('https://res.cloudinary.com/') || u.startsWith(`${env.SERVER_URL}/uploads/`);

export const auth = {
  register: { body: z.object({ name: z.string().trim().min(2, 'Enter your name').max(60), username, email, password }) },
  login: { body: z.object({ identifier: z.string().trim().toLowerCase().min(3), password: z.string().min(1) }) },
  google: { body: z.object({ credential: z.string().min(10) }) },
  verifyEmail: { body: z.object({ token: z.string().min(20) }) },
  forgot: { body: z.object({ email }) },
  reset: { body: z.object({ token: z.string().min(20), password }) },
  changePassword: { body: z.object({ currentPassword: z.string().optional(), newPassword: password }) },
};

export const users = {
  search: { query: z.object({ q: z.string().trim().max(50).default('') }) },
  update: {
    body: z.object({
      name: z.string().trim().min(2).max(60).optional(),
      username: username.optional(),
      bio: z.string().trim().max(240).optional(),
      statusText: z.string().trim().max(80).optional(),
      statusEmoji: z.string().trim().max(8).optional(),
    }),
  },
  id: { params: idParam },
};

export const chat = {
  id: { params: idParam },
  listConversations: { query: z.object({ archived: z.enum(['true', 'false']).optional() }) },
  direct: { body: z.object({ userId: objectId }) },
  createGroup: {
    body: z.object({
      name: z.string().trim().min(2, 'Group name is too short').max(60),
      description: z.string().trim().max(240).optional().default(''),
      memberIds: z.array(objectId).min(1, 'Add at least one member').max(255),
    }),
  },
  archive: { params: idParam, body: z.object({ archived: z.boolean() }) },
  getMessages: { params: idParam, query: z.object({ before: objectId.optional(), limit: z.coerce.number().int().min(1).max(50).default(30) }) },
  media: { params: idParam, query: z.object({ kind: z.enum(['media', 'files']).default('media') }) },
  sendMessage: {
    params: idParam,
    body: z
      .object({
        text: z.string().max(4000).optional().default(''),
        clientId: z.string().max(64).optional(),
        replyTo: objectId.optional(),
        attachments: z
          .array(
            z.object({
              url: z.string().url().refine(trustedUrl, 'Untrusted file URL'),
              publicId: z.string().max(300).optional(),
              type: z.enum(['image', 'video', 'audio', 'file']),
              name: z.string().max(200).optional(),
              size: z.number().nonnegative().optional(),
              mimeType: z.string().max(100).optional(),
              duration: z.number().nonnegative().max(3600).optional(),
            })
          )
          .max(10)
          .optional()
          .default([]),
        poll: z
          .object({
            question: z.string().trim().min(1).max(200),
            options: z.array(z.string().trim().min(1).max(100)).min(2, 'A poll needs at least 2 options').max(6),
            multiple: z.boolean().optional().default(false),
          })
          .optional(),
        scheduledFor: z.coerce.date().optional(),
      })
      .refine((b) => b.text.trim() || b.attachments.length || b.poll, { message: 'Message cannot be empty' }),
  },
  editMessage: { params: idParam, body: z.object({ text: z.string().trim().min(1).max(4000) }) },
  deleteMessage: { params: idParam, query: z.object({ scope: z.enum(['me', 'everyone']).default('me') }) },
  react: { params: idParam, body: z.object({ emoji: z.string().min(1).max(16) }) },
  forward: { params: idParam, body: z.object({ conversationIds: z.array(objectId).min(1).max(10) }) },
  vote: { params: idParam, body: z.object({ optionIndex: z.number().int().min(0).max(5) }) },
  search: { query: z.object({ q: z.string().trim().min(1).max(100), conversationId: objectId.optional() }) },
  groupUpdate: { params: idParam, body: z.object({ name: z.string().trim().min(2).max(60).optional(), description: z.string().trim().max(240).optional() }) },
  groupMembers: { params: idParam, body: z.object({ userIds: z.array(objectId).min(1).max(100) }) },
};

export const social = {
  friendRequest: { body: z.object({ userId: objectId }) },
  report: {
    body: z
      .object({
        targetUser: objectId.optional(),
        targetMessage: objectId.optional(),
        reason: z.enum(['spam', 'harassment', 'hate', 'violence', 'nudity', 'scam', 'other']),
        details: z.string().trim().max(1000).optional().default(''),
      })
      .refine((b) => b.targetUser || b.targetMessage, { message: 'Choose a person or message to report' }),
  },
  settings: {
    body: z.object({
      theme: z.enum(['system', 'light', 'dark']).optional(),
      enterToSend: z.boolean().optional(),
      notifications: z.object({ sound: z.boolean(), desktop: z.boolean(), preview: z.boolean() }).partial().optional(),
      privacy: z.object({ showOnline: z.boolean(), showLastSeen: z.boolean(), readReceipts: z.boolean() }).partial().optional(),
    }),
  },
};

export const admin = {
  users: {
    query: z.object({
      q: z.string().trim().max(50).default(''),
      status: z.enum(['all', 'banned', 'online', 'unverified']).default('all'),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(15),
    }),
  },
  ban: { params: idParam, body: z.object({ reason: z.string().trim().max(300).optional().default('') }) },
  role: { params: idParam, body: z.object({ role: z.enum(['user', 'admin']) }) },
  conversations: { query: z.object({ q: z.string().trim().max(50).default(''), page: z.coerce.number().int().min(1).default(1) }) },
  convMessages: { params: idParam, query: z.object({ before: objectId.optional() }) },
  deleteMessage: { params: idParam, body: z.object({ reason: z.string().trim().max(300).optional().default('') }) },
  reports: { query: z.object({ status: z.enum(['all', 'open', 'reviewing', 'resolved', 'dismissed']).default('open') }) },
  updateReport: {
    params: idParam,
    body: z.object({
      status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']),
      note: z.string().trim().max(500).optional().default(''),
      action: z.enum(['none', 'ban_user', 'delete_message']).optional().default('none'),
    }),
  },
  logs: { query: z.object({ level: z.enum(['all', 'info', 'warn', 'error']).default('all'), q: z.string().trim().max(50).default(''), page: z.coerce.number().int().min(1).default(1) }) },
};
