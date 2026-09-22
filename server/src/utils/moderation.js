import { env } from '../config/env.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = env.bannedWords.length ? new RegExp(`\\b(${env.bannedWords.map(escapeRe).join('|')})\\b`, 'gi') : null;

// Masks banned words and reports whether anything was flagged.
export function moderateText(text = '') {
  if (!re || !text) return { text, flagged: false };
  let flagged = false;
  const cleaned = text.replace(re, (m) => {
    flagged = true;
    return '*'.repeat(m.length);
  });
  return { text: cleaned, flagged };
}
