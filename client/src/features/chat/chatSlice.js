import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { chatService } from '../../services/chatService';
import { presenceUpdated } from '../common/actions';
import { idOf, uid } from '../../lib/utils';

/* ------------------------------------------------------------------ thunks */

export const fetchConversations = createAsyncThunk('chat/fetchConversations', async () => {
  const [active, archived] = await Promise.all([chatService.conversations(false), chatService.conversations(true)]);
  return [...active.data.conversations, ...archived.data.conversations];
});

export const fetchConversation = createAsyncThunk('chat/fetchConversation', async (id) => (await chatService.conversation(id)).data.conversation);
// Thunks below reject with the server's message so modals can show a helpful error.
const guard = (fn) => async (arg, { rejectWithValue }) => {
  try { return await fn(arg); } catch (err) { return rejectWithValue({ message: err?.response?.data?.message || 'Something went wrong' }); }
};
export const openDirectChat = createAsyncThunk('chat/openDirect', guard(async (userId) => (await chatService.openDirect(userId)).data.conversation));
export const openAiChat = createAsyncThunk('chat/openAi', guard(async () => (await chatService.openAi()).data.conversation));
export const createGroupChat = createAsyncThunk('chat/createGroup', guard(async (body) => (await chatService.createGroup(body)).data.conversation));

// Loads the newest page (first open / reset) or the page before the oldest loaded message.
export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ conversationId, reset = false }, { getState }) => {
    const bucket = getState().chat.messages[conversationId];
    const before = reset ? undefined : bucket?.items.find((m) => !m._status)?._id;
    const { data } = await chatService.messages(conversationId, { before, limit: 30 });
    return { conversationId, messages: data.messages, hasMore: data.hasMore, reset };
  },
  { condition: ({ conversationId }, { getState }) => !getState().chat.messages[conversationId]?.loading }
);

export const fetchPinned = createAsyncThunk('chat/fetchPinned', async (conversationId) => ({ conversationId, messages: (await chatService.pinned(conversationId)).data.messages }));

export const markConversationRead = createAsyncThunk('chat/markRead', async (conversationId, { dispatch }) => {
  dispatch(unreadCleared(conversationId));
  await chatService.markRead(conversationId);
});

/**
 * Optimistic send: the message appears instantly with _status "sending", then the server copy replaces it
 * (matched by clientId). On failure it stays in the list marked "failed" so the user can retry.
 */
export const sendMessage = createAsyncThunk('chat/send', async (draft, { dispatch, getState }) => {
  const { conversationId, text = '', attachments = [], replyTo = null, poll = null, scheduledFor = null } = draft;
  const me = getState().auth.user;
  const clientId = draft.clientId || uid();
  const scheduled = Boolean(scheduledFor);

  if (!scheduled) {
    dispatch(messageUpserted({
      message: {
        _id: clientId, clientId, conversation: conversationId, sender: me,
        type: poll ? 'poll' : attachments.length ? attachments[0].type : 'text',
        text, attachments,
        replyTo: replyTo && { _id: replyTo._id, text: replyTo.text, type: replyTo.type, attachments: replyTo.attachments, sender: replyTo.sender, poll: replyTo.poll },
        poll: poll && { question: poll.question, multiple: poll.multiple, options: poll.options.map((t) => ({ text: t, votes: [] })) },
        reactions: [], deliveredTo: [], readBy: [], createdAt: new Date().toISOString(),
        _status: 'sending', _draft: { ...draft, clientId },
      },
      meId: me._id, isViewing: true,
    }));
  }
  try {
    const { data } = await chatService.send(conversationId, { text, attachments, replyTo: replyTo?._id, poll, scheduledFor, clientId });
    if (!scheduled) dispatch(messageUpserted({ message: data.message, meId: me._id, isViewing: true }));
    return { scheduled };
  } catch (err) {
    if (!scheduled) dispatch(messageFailed({ conversationId, clientId }));
    throw err;
  }
});

/* ------------------------------------------------------------------ helpers */

const emptyBucket = () => ({ items: [], hasMore: true, loading: false, initialized: false });
const bucketOf = (state, id) => (state.messages[id] ||= emptyBucket());

const sortIds = (state) => {
  state.ids.sort((a, b) => new Date(state.byId[b].lastMessageAt) - new Date(state.byId[a].lastMessageAt));
};

// Replace by _id or clientId, otherwise append. Returns true when the message is new.
function upsertInto(items, msg) {
  const i = items.findIndex((m) => m._id === msg._id || (msg.clientId && m.clientId === msg.clientId));
  if (i >= 0) { items[i] = msg; return false; }
  items.push(msg);
  return true;
}

const toPreview = (m) => ({
  _id: m._id, text: m.text, type: m.type, sender: m.sender, createdAt: m.createdAt,
  deletedForEveryone: !!m.deletedForEveryone, attachments: (m.attachments || []).slice(0, 1),
});

/* ------------------------------------------------------------------ slice */

const slice = createSlice({
  name: 'chat',
  initialState: {
    byId: {}, ids: [], status: 'idle', // idle | loading | ready
    activeId: null,
    messages: {}, // conversationId -> { items, hasMore, loading, initialized }
    typing: {}, // conversationId -> { userId: name }
    pinned: {}, // conversationId -> messages[]
    replyTo: null,
    editing: null,
  },
  reducers: {
    activeSet(state, { payload }) { state.activeId = payload; },
    replyToSet(state, { payload }) { state.replyTo = payload; if (payload) state.editing = null; },
    editingSet(state, { payload }) { state.editing = payload; if (payload) state.replyTo = null; },

    conversationUpserted(state, { payload }) {
      const existing = state.byId[payload._id];
      state.byId[payload._id] = existing ? { ...existing, ...payload } : payload;
      if (!state.ids.includes(payload._id)) state.ids.push(payload._id);
      sortIds(state);
    },
    conversationPatched(state, { payload: { conversationId, patch } }) {
      if (state.byId[conversationId]) Object.assign(state.byId[conversationId], patch);
    },
    conversationRemoved(state, { payload: id }) {
      delete state.byId[id];
      delete state.messages[id];
      state.ids = state.ids.filter((x) => x !== id);
    },
    archivedSet(state, { payload: { id, archived } }) {
      if (state.byId[id]) state.byId[id].me.archived = archived;
    },
    unreadCleared(state, { payload: id }) { if (state.byId[id]) state.byId[id].me.unread = 0; },

    messageUpserted(state, { payload: { message, meId, isViewing } }) {
      const cid = message.conversation;
      const bucket = state.messages[cid];
      let isNew = true;
      if (bucket?.initialized) isNew = upsertInto(bucket.items, message);

      const conv = state.byId[cid];
      if (!conv) return;
      conv.lastMessage = toPreview(message);
      conv.lastMessageAt = message.createdAt;
      const mine = idOf(message.sender) === meId;
      if (!mine && isNew && message.type !== 'system') {
        if (!isViewing) conv.me.unread += 1;
        conv.me.archived = false;
      }
      sortIds(state);
    },
    messageFailed(state, { payload: { conversationId, clientId } }) {
      const m = state.messages[conversationId]?.items.find((x) => x.clientId === clientId && x._status);
      if (m) m._status = 'failed';
    },
    messageRemoved(state, { payload: { conversationId, messageId } }) {
      const b = state.messages[conversationId];
      if (b) b.items = b.items.filter((m) => m._id !== messageId);
    },
    messagePatched(state, { payload: { conversationId, messageId, patch } }) {
      const m = state.messages[conversationId]?.items.find((x) => x._id === messageId);
      if (m) Object.assign(m, patch);
      const pinned = state.pinned[conversationId];
      if (pinned) {
        const p = pinned.find((x) => x._id === messageId);
        if (p) Object.assign(p, patch);
        if (patch.pinned === false || patch.deletedForEveryone) state.pinned[conversationId] = pinned.filter((x) => x._id !== messageId);
      }
      const lm = state.byId[conversationId]?.lastMessage;
      if (lm && lm._id === messageId) {
        if ('text' in patch) lm.text = patch.text;
        if (patch.deletedForEveryone) { lm.deletedForEveryone = true; lm.text = ''; lm.attachments = []; }
      }
    },

    typingSet(state, { payload: { conversationId, user, isTyping } }) {
      const t = (state.typing[conversationId] ||= {});
      if (isTyping) t[user._id] = user.name; else delete t[user._id];
    },
    deliveredAll(state, { payload: { conversationId, userId, meId } }) {
      const at = new Date().toISOString();
      state.messages[conversationId]?.items.forEach((m) => {
        if (idOf(m.sender) === meId && !m._status && !m.deliveredTo?.some((d) => idOf(d.user) === userId)) (m.deliveredTo ||= []).push({ user: userId, at });
      });
    },
    seenAll(state, { payload: { conversationId, userId, meId, at } }) {
      state.messages[conversationId]?.items.forEach((m) => {
        if (idOf(m.sender) !== meId || m._status) return;
        if (!m.deliveredTo?.some((d) => idOf(d.user) === userId)) (m.deliveredTo ||= []).push({ user: userId, at });
        if (!m.readBy?.some((d) => idOf(d.user) === userId)) (m.readBy ||= []).push({ user: userId, at });
      });
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchConversations.pending, (s) => { if (s.status === 'idle') s.status = 'loading'; })
      .addCase(fetchConversations.fulfilled, (s, { payload }) => {
        s.byId = Object.fromEntries(payload.map((c) => [c._id, c]));
        s.ids = payload.map((c) => c._id);
        sortIds(s);
        s.status = 'ready';
      })
      .addCase(fetchConversations.rejected, (s) => { s.status = 'ready'; })
      .addCase(fetchConversation.fulfilled, (s, { payload }) => {
        s.byId[payload._id] = payload;
        if (!s.ids.includes(payload._id)) s.ids.push(payload._id);
        sortIds(s);
      })
      .addCase(openDirectChat.fulfilled, upsertConversation)
      .addCase(openAiChat.fulfilled, upsertConversation)
      .addCase(createGroupChat.fulfilled, upsertConversation)

      .addCase(fetchMessages.pending, (s, { meta }) => { bucketOf(s, meta.arg.conversationId).loading = true; })
      .addCase(fetchMessages.rejected, (s, { meta }) => { if (!meta.condition) bucketOf(s, meta.arg.conversationId).loading = false; })
      .addCase(fetchMessages.fulfilled, (s, { payload }) => {
        const bucket = bucketOf(s, payload.conversationId);
        const pending = bucket.items.filter((m) => m._status); // keep unsent messages at the bottom
        if (payload.reset) bucket.items = [...payload.messages, ...pending];
        else {
          const known = new Set(bucket.items.map((m) => m._id));
          bucket.items = [...payload.messages.filter((m) => !known.has(m._id)), ...bucket.items];
        }
        bucket.hasMore = payload.hasMore;
        bucket.loading = false;
        bucket.initialized = true;
      })
      .addCase(fetchPinned.fulfilled, (s, { payload }) => { s.pinned[payload.conversationId] = payload.messages; })

      .addCase(presenceUpdated, (s, { payload: { userId, isOnline, lastSeen } }) => {
        for (const c of Object.values(s.byId)) {
          const p = c.participants.find((x) => x._id === userId);
          if (p && !p.isBot) { p.isOnline = isOnline; if (lastSeen) p.lastSeen = lastSeen; }
        }
      });
  },
});

function upsertConversation(state, { payload }) {
  state.byId[payload._id] = { ...state.byId[payload._id], ...payload };
  if (!state.ids.includes(payload._id)) state.ids.push(payload._id);
  sortIds(state);
}

export const {
  activeSet, replyToSet, editingSet, conversationUpserted, conversationPatched, conversationRemoved, archivedSet, unreadCleared,
  messageUpserted, messageFailed, messageRemoved, messagePatched, typingSet, deliveredAll, seenAll,
} = slice.actions;
export default slice.reducer;
