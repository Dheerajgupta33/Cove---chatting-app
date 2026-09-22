import { useCallback, useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';

// Emits "typing" once when the user starts, and "stopped" after 2.5s of silence (or on send / chat switch).
export function useTyping(conversationId) {
  const state = useRef({ active: false, timer: null });

  const stop = useCallback(() => {
    const s = state.current;
    clearTimeout(s.timer);
    if (s.active) {
      s.active = false;
      getSocket()?.emit('typing', { conversationId, isTyping: false });
    }
  }, [conversationId]);

  const onType = useCallback(() => {
    const s = state.current;
    if (!s.active) {
      s.active = true;
      getSocket()?.emit('typing', { conversationId, isTyping: true });
    }
    clearTimeout(s.timer);
    s.timer = setTimeout(stop, 2500);
  }, [conversationId, stop]);

  useEffect(() => stop, [stop]);
  return { onType, stop };
}
