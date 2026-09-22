import mongoose from 'mongoose';
const { Schema } = mongoose;

// Per-member state lives inside the conversation so unread counts / archive are per user.
const memberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unread: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
    lastReadAt: Date,
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new Schema(
  {
    type: { type: String, enum: ['direct', 'group', 'ai'], required: true },
    members: [memberSchema],
    // Sorted "idA_idB" so a direct chat between two users is unique. AI chats use "ai_<userId>".
    directKey: { type: String, unique: true, sparse: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group' },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

conversationSchema.index({ 'members.user': 1, lastMessageAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
