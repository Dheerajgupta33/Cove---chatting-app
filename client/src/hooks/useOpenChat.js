import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { openAiChat, openDirectChat } from '../features/chat/chatSlice';
import { errorMessage } from '../lib/utils';

// Open (or create) a direct chat / the AI chat and navigate to it.
export function useOpenChat() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const go = useCallback(async (thunk) => {
    try {
      const conv = await dispatch(thunk).unwrap();
      navigate(`/app/chat/${conv._id}`);
      return conv;
    } catch (e) {
      toast.error(e?.message && !e.response ? 'Could not open that chat' : errorMessage(e));
      return null;
    }
  }, [dispatch, navigate]);

  return {
    withUser: useCallback((userId) => go(openDirectChat(userId)), [go]),
    withAi: useCallback(() => go(openAiChat()), [go]),
  };
}
