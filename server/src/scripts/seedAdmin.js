// Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:admin
// Creates the first administrator (or promotes an existing account with that email).
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first.');
  process.exit(1);
}

await connectDB();
const email = env.ADMIN_EMAIL.toLowerCase();
let user = await User.findOne({ email });
if (user) {
  user.role = 'admin';
  user.isVerified = true;
  await user.save();
  console.log(`✅ Promoted existing user ${email} to admin`);
} else {
  user = await User.create({ name: 'Admin', username: 'admin', email, password: env.ADMIN_PASSWORD, role: 'admin', isVerified: true });
  await Settings.create({ user: user._id });
  console.log(`✅ Created admin ${email}`);
}
await mongoose.disconnect();
