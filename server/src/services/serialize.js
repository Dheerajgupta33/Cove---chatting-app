import { USER_PUBLIC } from '../models/User.js';

// Populate recipes shared by controllers.
export const MSG_POPULATE = [
  { path: 'sender', select: USER_PUBLIC },
  { path: 'replyTo', select: 'text type attachments sender deletedForEveryone poll.question', populate: { path: 'sender', select: 'name username' } },
  { path: 'forwardedFrom', select: 'name username' },
];

export const CONV_POPULATE = [
  { path: 'members.user', select: USER_PUBLIC },
  { path: 'group', select: 'name description avatar owner admins' },
  { path: 'lastMessage', select: 'text type sender createdAt deletedForEveryone attachments', populate: { path: 'sender', select: 'name username' } },
];

const plain = (doc) => (doc?.toObject ? doc.toObject() : doc);
const idOf = (v) => String(v?._id ?? v);

// Removes private fields and adds per-viewer flags.
export function presentMessage(message, viewerId) {
  const m = { ...plain(message) };
  m.isStarred = viewerId ? (m.starredBy || []).some((id) => idOf(id) === String(viewerId)) : false;
  delete m.starredBy;
  delete m.deletedFor;
  delete m.__v;
  if (m.deletedForEveryone) {
    m.text = '';
    m.attachments = [];
    m.poll = undefined;
    m.reactions = [];
  }
  return m;
}

export function presentConversation(conversation, viewerId) {
  const c = plain(conversation);
  const mine = c.members.find((m) => idOf(m.user) === String(viewerId));
  const lm = c.lastMessage;
  return {
    _id: c._id,
    type: c.type,
    participants: c.members.map((m) => m.user),
    group: c.group ? { _id: c.group._id, name: c.group.name, description: c.group.description, avatar: c.group.avatar, owner: c.group.owner, admins: c.group.admins } : null,
    me: { unread: mine?.unread || 0, archived: !!mine?.archived },
    lastMessage: lm && lm._id
      ? { _id: lm._id, text: lm.text, type: lm.type, sender: lm.sender, createdAt: lm.createdAt, deletedForEveryone: lm.deletedForEveryone, attachments: (lm.attachments || []).slice(0, 1) }
      : null,
    lastMessageAt: c.lastMessageAt,
    createdAt: c.createdAt,
  };
}

// Own profile shape returned by auth endpoints.
export const presentSelf = (u) => ({
  _id: u._id,
  name: u.name,
  username: u.username,
  email: u.email,
  avatar: u.avatar?.url ? { url: u.avatar.url } : null,
  bio: u.bio,
  statusText: u.statusText,
  statusEmoji: u.statusEmoji,
  role: u.role,
  isVerified: u.isVerified,
  hasPassword: u.hasPassword,
  createdAt: u.createdAt,
});
