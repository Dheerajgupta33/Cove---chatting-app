import { useEffect } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { refreshAccessToken } from '../services/api';
import { sessionExpired, tokenRefreshed, presenceUpdated } from '../features/common/actions';
import {
  conversationPatched, conversationRemoved, conversationUpserted, deliveredAll, fetchConversation, fetchConversations,
  fetchMessages, fetchPinned, markConversationRead, messagePatched, messageUpserted, seenAll, typingSet,
} from '../features/chat/chatSlice';
import { notificationAdded } from '../features/notifications/notificationsSlice';
import { fetchActive, fetchFriends, requestReceived } from '../features/friends/friendsSlice';
import { callCleared, callPatched, callSet } from '../features/ui/uiSlice';
import { showMessageToast } from '../components/common/MessageToast';
import { conversationMeta } from '../lib/chat';
import { idOf, messagePreview } from '../lib/utils';
import { playPing } from '../lib/sound';

/**
 * Bridges Socket.IO -> Redux. Mounted once inside the authenticated shell.
 * Server events: see README "Realtime events".
 */
export function useSocketEvents() {
  const dispatch = useDispatch();
  const store = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const socket = connectSocket(() => store.getState().auth.accessToken);
    const typingTimers = {};
    const readTimers = {};
    let connectedBefore = false;

    const me = () => store.getState().auth.user?._id;
    const settings = () => store.getState().ui.settings;
    // Debounced so a burst of messages triggers a single "seen".
    const scheduleRead = (cid) => {
      clearTimeout(readTimers[cid]);
      readTimers[cid] = setTimeout(() => dispatch(markConversationRead(cid)), 250);
    };

    const handlers = {
      connect: () => {
        // After a reconnect we may have missed events: resync the lists and the open chat.
        if (connectedBefore) {
          dispatch(fetchConversations());
          dispatch(fetchActive());
          const active = store.getState().chat.activeId;
          if (active) dispatch(fetchMessages({ conversationId: active, reset: true }));
        }
        connectedBefore = true;
      },

      // Expired access token on (re)connect: refresh through the cookie, then try again.
      connect_error: async (err) => {
        if (err?.message !== 'unauthorized') return;
        try {
          dispatch(tokenRefreshed(await refreshAccessToken()));
          getSocket()?.connect();
        } catch {
          dispatch(sessionExpired());
        }
      },

      'message:new': ({ message }) => {
        const state = store.getState();
        const meId = me();
        const cid = message.conversation;
        const senderId = idOf(message.sender);
        const mine = senderId === meId;
        const conv = state.chat.byId[cid];

        // First message of a brand-new conversation: fetch it (includes the message + unread count).
        if (!conv) { dispatch(fetchConversation(cid)); return; }

        const isViewing = state.chat.activeId === cid && document.visibilityState === 'visible';
        dispatch(messageUpserted({ message, meId, isViewing }));
        if (mine || message.type === 'system') return;

        dispatch(typingSet({ conversationId: cid, user: { _id: senderId }, isTyping: false }));
        if (isViewing) { scheduleRead(cid); return; }

        const s = settings();
        if (s.notifications.sound) playPing();
        const meta = conversationMeta(conv, meId);
        const who = message.sender?.name || meta.title;
        const title = meta.isGroup ? `${who} in ${meta.title}` : meta.title;
        const body = s.notifications.preview ? messagePreview(message) : 'New message';
        const open = () => navigate(`/app/chat/${cid}`);
        if (document.visibilityState === 'visible') {
          showMessageToast({ id: cid, title, body, avatar: meta.avatar, isBot: meta.isAi, onOpen: open });
        } else if (s.notifications.desktop && 'Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(title, { body, icon: '/favicon.svg', tag: cid });
          n.onclick = () => { window.focus(); open(); n.close(); };
        }
      },

      'message:updated': ({ conversationId, messageId, patch }) => {
        dispatch(messagePatched({ conversationId, messageId, patch }));
        if ('pinned' in patch) dispatch(fetchPinned(conversationId));
      },

      'conversation:delivered': ({ conversationId, userId }) => {
        if (userId !== me()) dispatch(deliveredAll({ conversationId, userId, meId: me() }));
      },
      'conversation:seen': ({ conversationId, userId, at }) => {
        if (userId !== me()) dispatch(seenAll({ conversationId, userId, meId: me(), at }));
      },

      typing: ({ conversationId, user, isTyping }) => {
        if (user._id === me()) return;
        dispatch(typingSet({ conversationId, user, isTyping }));
        const key = `${conversationId}:${user._id}`;
        clearTimeout(typingTimers[key]);
        // Safety net in case the "stopped typing" event is lost.
        if (isTyping) typingTimers[key] = setTimeout(() => dispatch(typingSet({ conversationId, user, isTyping: false })), 5000);
      },

      'presence:update': (payload) => dispatch(presenceUpdated(payload)),

      'conversation:new': ({ conversation }) => dispatch(conversationUpserted(conversation)),
      'conversation:updated': ({ conversationId, patch }) => dispatch(conversationPatched({ conversationId, patch })),
      'conversation:removed': ({ conversationId }) => {
        dispatch(conversationRemoved(conversationId));
        if (store.getState().chat.activeId === conversationId) navigate('/app/chat');
      },

      'notification:new': (n) => {
        dispatch(notificationAdded(n));
        if (settings().notifications.sound) playPing();
        toast(n.title, { icon: '🔔' });
      },

      'friend:request': ({ request }) => dispatch(requestReceived(request)),
      'friend:accepted': () => dispatch(fetchFriends()),

      /* ---- calls ---- */
      'call:incoming': (call) => {
        if (store.getState().ui.call) { getSocket()?.emit('call:decline', { callId: call.callId }); return; } // already busy
        dispatch(callSet({ id: call.callId, status: 'incoming', type: call.type, peer: call.from, conversationId: call.conversationId }));
      },
      'call:accepted': ({ callId }) => {
        if (store.getState().ui.call?.id === callId) dispatch(callPatched({ status: 'connected', startedAt: Date.now() }));
      },
      'call:declined': ({ callId }) => {
        if (store.getState().ui.call?.id !== callId) return;
        toast('Call declined');
        dispatch(callCleared());
      },
      'call:ended': ({ callId }) => {
        if (store.getState().ui.call?.id !== callId) return;
        toast('Call ended');
        dispatch(callCleared());
      },
    };

    Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn));
    return () => {
      Object.values({ ...typingTimers, ...readTimers }).forEach(clearTimeout);
      Object.entries(handlers).forEach(([event, fn]) => socket.off(event, fn));
      disconnectSocket();
    };
  }, [dispatch, store, navigate]);
}
