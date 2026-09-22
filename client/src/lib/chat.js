import { idOf } from './utils';

export const getPeer = (conv, meId) => conv?.participants?.find((p) => p._id !== meId);

/** Everything the UI needs to title/avatar a conversation, regardless of its type. */
export function conversationMeta(conv, meId) {
  if (!conv) return { title: '', avatar: null, isGroup: false, isAi: false, peer: null };
  if (conv.type === 'group') {
    return { title: conv.group?.name || 'Group', avatar: conv.group?.avatar?.url, isGroup: true, isAi: false, peer: null };
  }
  const peer = getPeer(conv, meId) || {};
  return { title: peer.name || 'Unknown user', avatar: peer.avatar?.url, isGroup: false, isAi: conv.type === 'ai', peer };
}

/** [{ emoji, count, mine, users }] */
export function reactionGroups(reactions = [], meId) {
  const map = new Map();
  for (const r of reactions) {
    const uid = idOf(r.user);
    const g = map.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false, users: [] };
    g.count += 1;
    g.users.push(uid);
    if (uid === meId) g.mine = true;
    map.set(r.emoji, g);
  }
  return [...map.values()];
}

/** sending | failed | sent | delivered | seen */
export function messageStatus(m) {
  if (m._status) return m._status;
  if (m.readBy?.length) return 'seen';
  if (m.deliveredTo?.length) return 'delivered';
  return 'sent';
}

export const isMedia = (a) => a.type === 'image' || a.type === 'video';

// Total unread across non-archived conversations (tab title + nav badge).
export const selectUnreadTotal = (s) => Object.values(s.chat.byId).reduce((n, c) => n + (c.me.archived ? 0 : c.me.unread), 0);
