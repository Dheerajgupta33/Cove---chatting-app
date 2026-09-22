import mongoose from 'mongoose';
const { Schema } = mongoose;

// Audit + activity trail. Auto-expires after 90 days.
const systemLogSchema = new Schema(
  {
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    action: { type: String, required: true, index: true }, // e.g. auth.login, admin.ban
    actor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    target: { type: Schema.Types.ObjectId },
    message: { type: String, default: '' },
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

systemLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.model('SystemLog', systemLogSchema);
