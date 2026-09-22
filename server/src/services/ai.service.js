import Message from '../models/Message.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { emitToConversation } from './realtime.js';
import { publishMessage } from './message.service.js';

export const BOT_USERNAME = 'cove_ai';
let botCache;

// The assistant is a real (bot) user so it fits the normal conversation/message model.
export async function ensureBotUser() {
  botCache = await User.findOneAndUpdate(
    { username: BOT_USERNAME },
    {
      $setOnInsert: {
        name: 'Cove AI',
        username: BOT_USERNAME,
        email: 'ai@cove.local',
        isBot: true,
        isVerified: true,
        bio: 'Your built-in assistant. Ask me anything, or have me tidy up a draft.',
        statusEmoji: '✨',
        statusText: 'Always around',
      },
      $set: { isOnline: true },
    },
    { upsert: true, new: true }
  );
  return botCache;
}
export const getBot = async () => botCache || ensureBotUser();

const SYSTEM_PROMPT =
  'You are Cove AI, a friendly assistant inside a chat app. Keep answers short and conversational ' +
  '(under 150 words unless asked for more). Use plain text; use simple lists only when they help.';

async function generateReply(history) {
  if (!env.aiEnabled) {
    return "I'm running in demo mode because no AI key is configured on the server yet. Add ANTHROPIC_API_KEY to the server environment and I'll answer for real.";
  }
  // The API requires alternating roles that start with "user": merge consecutive turns and trim the head.
  const turns = [];
  for (const m of history) {
    if (turns.length && turns[turns.length - 1].role === m.role) turns[turns.length - 1].content += `\n${m.content}`;
    else turns.push({ ...m });
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length) return 'Say something and I will reply!';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.AI_MODEL, max_tokens: 700, system: SYSTEM_PROMPT, messages: turns }),
  });
  if (!res.ok) throw new Error(`AI provider responded ${res.status}`);
  const data = await res.json();
  return data.content?.filter((b) => b.type === 'text').map((b) => b.text).join('').trim() || '…';
}

// Called after a user message is saved in an AI conversation. Never throws.
export async function maybeReplyWithAI(conversation) {
  if (conversation.type !== 'ai') return;
  const bot = await getBot();
  const typing = (isTyping) =>
    emitToConversation(conversation._id, 'typing', { conversationId: String(conversation._id), user: { _id: String(bot._id), name: bot.name }, isTyping });

  typing(true);
  try {
    const recent = await Message.find({ conversation: conversation._id, isScheduled: false, deletedForEveryone: false, type: { $ne: 'system' } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const history = recent.reverse().map((m) => ({
      role: String(m.sender) === String(bot._id) ? 'assistant' : 'user',
      content: m.text || (m.attachments?.length ? `[sent ${m.attachments[0].type}: ${m.attachments[0].name || 'file'}]` : '[message]'),
    }));

    let text;
    try {
      text = await generateReply(history);
    } catch (err) {
      console.error('AI error:', err.message);
      text = "Sorry, I couldn't reach my brain just now. Try again in a moment.";
    }
    const message = await Message.create({ conversation: conversation._id, sender: bot._id, type: 'text', text: text.slice(0, 4000) });
    await publishMessage(message, conversation);
  } finally {
    typing(false);
  }
}
