import mongoose from 'mongoose';
const { Schema } = mongoose;

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', maxlength: 240 },
    avatar: { url: String, publicId: String },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  },
  { timestamps: true }
);

export default mongoose.model('Group', groupSchema);
