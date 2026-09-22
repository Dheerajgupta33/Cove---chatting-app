// Centralised, validated environment configuration.
// The process exits early with a readable message if something required is missing.
import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SERVER_URL: z.string().default('http://localhost:5000'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  ACCESS_TOKEN_EXPIRES: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(7),
  REQUIRE_EMAIL_VERIFICATION: bool,
  COOKIE_SAMESITE: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('Cove <no-reply@cove.app>'),

  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-sonnet-5'),

  BANNED_WORDS: z.string().default(''),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('\n❌ Invalid environment configuration:');
  parsed.error.issues.forEach((i) => console.error(`  • ${i.path.join('.')}: ${i.message}`));
  console.error('\nCopy server/.env.example to server/.env and fill it in.\n');
  process.exit(1);
}

const e = parsed.data;

export const env = {
  ...e,
  isProd: e.NODE_ENV === 'production',
  clientOrigins: e.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean),
  cloudinaryEnabled: Boolean(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET),
  smtpEnabled: Boolean(e.SMTP_HOST && e.SMTP_USER && e.SMTP_PASS),
  aiEnabled: Boolean(e.ANTHROPIC_API_KEY),
  bannedWords: e.BANNED_WORDS.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean),
};
