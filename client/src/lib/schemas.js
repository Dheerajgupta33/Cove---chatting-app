import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'That password is too long')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');
const username = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, '3-20 characters: letters, numbers, underscores');

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or username'),
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name').max(60),
    username,
    email,
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(60),
  username,
  bio: z.string().trim().max(240, 'Keep your bio under 240 characters'),
});

export const changePasswordSchema = z
  .object({ currentPassword: z.string().optional(), newPassword: password, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export const groupSchema = z.object({
  name: z.string().trim().min(2, 'Give the group a name').max(60),
  description: z.string().trim().max(240).optional(),
});
