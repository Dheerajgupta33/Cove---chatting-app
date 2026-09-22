import mongoose from 'mongoose';
const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
    targetMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    reason: { type: String, enum: ['spam', 'harassment', 'hate', 'violence', 'nudity', 'scam', 'other'], required: true },
    details: { type: String, default: '', maxlength: 1000 },
    status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Report', reportSchema);
