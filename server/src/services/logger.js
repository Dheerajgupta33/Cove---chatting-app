import SystemLog from '../models/SystemLog.js';

// Fire-and-forget audit/activity log. Never throws into the request path.
export async function logAction({ actor, action, target, message = '', level = 'info', req }) {
  try {
    await SystemLog.create({ actor, action, target, message, level, ip: req?.ip });
  } catch (err) {
    console.error('log failed', err.message);
  }
}
