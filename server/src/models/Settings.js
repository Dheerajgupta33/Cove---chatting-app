import mongoose from 'mongoose';
const { Schema } = mongoose;

const settingsSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    enterToSend: { type: Boolean, default: true },
    notifications: {
      sound: { type: Boolean, default: true },
      desktop: { type: Boolean, default: false },
      preview: { type: Boolean, default: true },
    },
    privacy: {
      showOnline: { type: Boolean, default: true },
      showLastSeen: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
