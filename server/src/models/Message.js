import mongoose from 'mongoose';
const { Schema } = mongoose;

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    type: { type: String, enum: ['image', 'video', 'audio', 'file'], required: true },
    name: String,
    size: Number,
    mimeType: String,
    duration: Number, // seconds (voice messages)
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: String, // lets the sender's optimistic message be matched with the saved one
    type: { type: String, enum: ['text', 'image', 'video', 'audio', 'file', 'poll', 'system'], default: 'text' },
    text: { type: String, default: '', maxlength: 4000 },
    attachments: [attachmentSchema],

    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    forwardedFrom: { type: Schema.Types.ObjectId, ref: 'User' },

    reactions: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, emoji: String, _id: false }],
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    hashtags: [String],

    poll: {
      question: String,
      multiple: { type: Boolean, default: false },
      options: [{ text: String, votes: [{ type: Schema.Types.ObjectId, ref: 'User' }], _id: false }],
    },

    edited: { type: Boolean, default: false },
    editedAt: Date,
    deletedForEveryone: { type: Boolean, default: false },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    pinned: { type: Boolean, default: false },
    pinnedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pinnedAt: Date,
    starredBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    deliveredTo: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date, _id: false }],
    readBy: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date, _id: false }],

    isScheduled: { type: Boolean, default: false },
    scheduledFor: Date,
    flagged: { type: Boolean, default: false }, // hit the banned-word filter
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1, _id: -1 });
messageSchema.index({ isScheduled: 1, scheduledFor: 1 });
messageSchema.index({ conversation: 1, pinned: 1 });
messageSchema.index({ starredBy: 1 });
messageSchema.index({ hashtags: 1 });
messageSchema.index({ flagged: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
