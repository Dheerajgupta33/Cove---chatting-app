import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Avatar from './Avatar';

// In-app "new message" toast. Clicking opens the conversation.
export function showMessageToast({ id, title, body, avatar, isBot, onOpen }) {
  toast.custom(
    (t) => (
      <motion.button
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: t.visible ? 1 : 0, y: t.visible ? 0 : -12, scale: 1 }}
        onClick={() => { toast.dismiss(t.id); onOpen?.(); }}
        className="glass-strong flex w-80 max-w-[92vw] items-center gap-3 rounded-2xl p-3 text-left shadow-pop"
      >
        <Avatar src={avatar} name={title} isBot={isBot} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{title}</span>
          <span className="block truncate text-sm text-sub">{body}</span>
        </span>
      </motion.button>
    ),
    { id, duration: 4500, position: 'top-right' }
  );
}
