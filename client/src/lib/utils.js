import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names, letting later Tailwind utilities win. */
export const cn = (...args) => twMerge(clsx(args));

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || '?';

// Deterministic gradient per name so avatars without a photo still feel personal.
const GRADIENTS = [
  ['#7c5cff', '#4f8bff'], ['#2dd4bf', '#3b82f6'], ['#f472b6', '#8b5cf6'], ['#fb923c', '#f43f5e'],
  ['#34d399', '#0ea5e9'], ['#a78bfa', '#ec4899'], ['#22d3ee', '#6366f1'], ['#f59e0b', '#ef4444'],
];
export const gradientFor = (seed = '') => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const [a, b] = GRADIENTS[h % GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
};

export const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let n = bytes / 1024, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[i]}`;
};

export const formatDuration = (s = 0) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || err?.message || fallback;

export const idOf = (v) => (v && typeof v === 'object' ? v._id : v);

/** One-line description of a message, used in chat list previews, replies and toasts. */
export function messagePreview(m) {
  if (!m) return '';
  if (m.deletedForEveryone) return 'This message was deleted';
  if (m.type === 'system') return m.text;
  if (m.type === 'image') return m.text || '📷 Photo';
  if (m.type === 'video') return m.text || '🎬 Video';
  if (m.type === 'audio') return '🎤 Voice message';
  if (m.type === 'file') return `📎 ${m.attachments?.[0]?.name || 'File'}`;
  if (m.type === 'poll') return `📊 ${m.poll?.question || 'Poll'}`;
  return m.text || '';
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
