import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { publishMessage } from '../services/message.service.js';
import { assertCanMessage } from '../services/access.js';

// Publishes scheduled messages when they are due. Polling is plenty for a single instance;
// for many instances move this to a queue (BullMQ / Agenda). The atomic "claim" below prevents double sends.
export function startScheduler() {
  const tick = async () => {
    try {
      const due = await Message.find({ isScheduled: true, scheduledFor: { $lte: new Date() } }).select('_id').limit(50).lean();
      for (const { _id } of due) {
        const now = new Date();
        const message = await Message.findOneAndUpdate({ _id, isScheduled: true }, { $set: { isScheduled: false, createdAt: now } }, { new: true, timestamps: false });
        if (!message) continue; // another instance claimed it
        const conv = await Conversation.findById(message.conversation);
        if (!conv) continue;
        try {
          await assertCanMessage(conv, message.sender);
          await publishMessage(message, conv);
        } catch (err) {
          // Blocked in the meantime: drop it rather than deliver.
          await message.deleteOne();
        }
      }
    } catch (err) {
      console.error('scheduler tick failed', err.message);
    }
  };
  const timer = setInterval(tick, 15_000);
  timer.unref();
  return () => clearInterval(timer);
}
