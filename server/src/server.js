import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/index.js';
import { startScheduler } from './jobs/scheduler.js';
import { ensureBotUser } from './services/ai.service.js';
import User from './models/User.js';

async function main() {
  await connectDB();

  // Nobody is connected right after a (re)start, so clear stale presence flags.
  await User.updateMany({ isBot: false, isOnline: true }, { isOnline: false });
  await ensureBotUser();

  const server = http.createServer(app);
  initSocket(server);
  const stopScheduler = startScheduler();

  server.listen(env.PORT, () => {
    console.log(`🚀 Cove API listening on :${env.PORT} (${env.NODE_ENV})`);
    if (!env.cloudinaryEnabled) console.log('ℹ️  Cloudinary not configured - uploads are stored in ./uploads (dev only)');
    if (!env.aiEnabled) console.log('ℹ️  ANTHROPIC_API_KEY not set - the AI assistant replies in demo mode');
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    stopScheduler();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

main().catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});
