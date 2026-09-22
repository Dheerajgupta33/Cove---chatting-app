import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    username: {
      type: String, required: true, unique: true, lowercase: true, trim: true,
      match: [/^[a-z0-9_]{3,20}$/, 'Username must be 3-20 chars: letters, numbers, underscore'],
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    hasPassword: { type: Boolean, default: false }, // false for Google-only accounts
    googleId: { type: String, index: true, sparse: true },

    avatar: { url: String, publicId: String },
    bio: { type: String, default: '', maxlength: 240 },
    statusText: { type: String, default: '', maxlength: 80 }, // custom status
    statusEmoji: { type: String, default: '', maxlength: 8 },

    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBot: { type: Boolean, default: false },

    isVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Hashed refresh tokens (rotation + reuse detection). Never selected by default.
    refreshTokens: {
      type: [{ tokenHash: String, expiresAt: Date, userAgent: String, rotatedAt: Date, createdAt: { type: Date, default: Date.now }, _id: false }],
      select: false,
      default: [],
    },

    isBanned: { type: Boolean, default: false, index: true },
    banReason: { type: String, default: '' },
    bannedAt: Date,

    isOnline: { type: Boolean, default: false },
    lastSeen: Date,

    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    favorites: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // Lightweight activity tracking (shown on the profile page)
    activity: {
      lastLoginAt: Date,
      loginCount: { type: Number, default: 0 },
      messagesSent: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

userSchema.index({ name: 'text', username: 'text' });

userSchema.pre('save', async function hash() {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
  this.hasPassword = true;
});

userSchema.methods.comparePassword = function compare(candidate) {
  return this.password ? bcrypt.compare(candidate, this.password) : false;
};

// Fields safe to show to other users.
export const USER_PUBLIC = 'name username avatar bio statusText statusEmoji isOnline lastSeen isBot';

export default mongoose.model('User', userSchema);
