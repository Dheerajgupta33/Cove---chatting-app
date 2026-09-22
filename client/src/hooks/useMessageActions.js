import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { chatService } from '../services/chatService';
import { editingSet, fetchPinned, messagePatched, messageRemoved, replyToSet, sendMessage } from '../features/chat/chatSlice';
import { forwardingSet } from '../features/ui/uiSlice';
import { errorMessage } from '../lib/utils';

/** All per-message operations in one place so bubbles, menus and panels behave identically. */
export function useMessageActions() {
  const dispatch = useDispatch();

  return useMemo(() => {
    const patch = (m, p) => dispatch(messagePatched({ conversationId: m.conversation, messageId: m._id, patch: p }));
    const run = async (fn) => { try { return await fn(); } catch (e) { toast.error(errorMessage(e)); return null; } };

    return {
      reply: (m) => dispatch(replyToSet(m)),
      startEdit: (m) => dispatch(editingSet(m)),
      forward: (m) => dispatch(forwardingSet(m)),

      react: (m, emoji) => run(async () => patch(m, { reactions: (await chatService.react(m._id, emoji)).data.reactions })),
      edit: (m, text) => run(async () => { await chatService.edit(m._id, text); patch(m, { text, edited: true, editedAt: new Date().toISOString() }); return true; }),
      vote: (m, index) => run(async () => patch(m, { poll: (await chatService.vote(m._id, index)).data.poll })),

      star: (m) => run(async () => {
        const { starred } = (await chatService.star(m._id)).data;
        patch(m, { isStarred: starred });
        toast.success(starred ? 'Added to starred' : 'Removed from starred');
      }),

      pin: (m) => run(async () => {
        const { pinned } = (await chatService.pin(m._id)).data;
        patch(m, { pinned });
        dispatch(fetchPinned(m.conversation));
        toast.success(pinned ? 'Message pinned' : 'Message unpinned');
      }),

      remove: (m, scope) => run(async () => {
        await chatService.remove(m._id, scope);
        if (scope === 'everyone') patch(m, { deletedForEveryone: true, text: '', attachments: [], reactions: [], pinned: false });
        else dispatch(messageRemoved({ conversationId: m.conversation, messageId: m._id }));
      }),

      copy: async (m) => {
        try { await navigator.clipboard.writeText(m.text); toast.success('Copied'); } catch { toast.error('Could not copy'); }
      },

      // Failed optimistic messages
      retry: (m) => {
        dispatch(messageRemoved({ conversationId: m.conversation, messageId: m._id }));
        dispatch(sendMessage(m._draft));
      },
      discard: (m) => dispatch(messageRemoved({ conversationId: m.conversation, messageId: m._id })),
    };
  }, [dispatch]);
}
