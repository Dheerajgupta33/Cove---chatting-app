import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import toast from 'react-hot-toast';
import { getSocket } from '../services/socket';
import { callCleared, callPatched, callSet } from '../features/ui/uiSlice';

// Call signalling over Socket.IO (ring / accept / decline / end). Media handling lives in CallOverlay.
export function useCall() {
  const dispatch = useDispatch();
  const store = useStore();

  const start = useCallback((conversation, peer, type) => {
    if (store.getState().ui.call) { toast('You are already in a call'); return; }
    const socket = getSocket();
    if (!socket?.connected) { toast.error('You are offline. Reconnecting…'); return; }
    dispatch(callSet({ id: null, status: 'outgoing', type, peer, conversationId: conversation._id }));
    socket.emit('call:invite', { conversationId: conversation._id, type }, (res) => {
      if (!res?.ok) { toast.error(res?.error || 'Could not start the call'); dispatch(callCleared()); return; }
      dispatch(callPatched({ id: res.callId }));
    });
  }, [dispatch, store]);

  const accept = useCallback(() => {
    const call = store.getState().ui.call;
    if (!call?.id) return;
    getSocket()?.emit('call:accept', { callId: call.id });
    dispatch(callPatched({ status: 'connected', startedAt: Date.now() }));
  }, [dispatch, store]);

  const decline = useCallback(() => {
    const call = store.getState().ui.call;
    if (call?.id) getSocket()?.emit('call:decline', { callId: call.id });
    dispatch(callCleared());
  }, [dispatch, store]);

  const end = useCallback(() => {
    const call = store.getState().ui.call;
    if (call?.id) getSocket()?.emit('call:end', { callId: call.id });
    dispatch(callCleared());
  }, [dispatch, store]);

  return { start, accept, decline, end };
}
