import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUnreadTotal } from '../../lib/chat';

const DEFAULT_DESC = 'Cove is a fast, calm chat app: direct messages, group rooms, voice notes, polls, scheduled messages and a built-in AI assistant.';

function setMeta(selector, attr, value, create) {
  let el = document.head.querySelector(selector);
  if (!el && create) { el = create(); document.head.appendChild(el); }
  el?.setAttribute(attr, value);
}

// Per-page <title>/description (crawlers that run JS pick these up) and an unread badge in the tab title.
export default function Seo({ title, description = DEFAULT_DESC, noindex = false }) {
  const unread = useSelector(selectUnreadTotal);
  useEffect(() => {
    document.title = `${unread > 0 ? `(${unread}) ` : ''}${title ? `${title} · Cove` : 'Cove - Real-time chat for people and teams'}`;
  }, [title, unread]);
  useEffect(() => {
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[name="robots"]', 'content', noindex ? 'noindex,nofollow' : 'index,follow', () => Object.assign(document.createElement('meta'), { name: 'robots' }));
  }, [description, noindex]);
  return null;
}
