// Small helpers for parsing rich message text.
export const extractMentions = (text = '') =>
  [...new Set((text.match(/@([a-z0-9_]{3,20})/gi) || []).map((m) => m.slice(1).toLowerCase()))];

export const extractHashtags = (text = '') =>
  [...new Set((text.match(/#[\p{L}\p{N}_]{2,50}/gu) || []).map((h) => h.slice(1).toLowerCase()))].slice(0, 10);

export const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

// { a: { b: 1 } } -> { 'a.b': 1 } so nested partial updates do not clobber siblings.
export const flatten = (obj, prefix = '') =>
  Object.entries(obj).reduce((acc, [k, v]) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) return { ...acc, ...flatten(v, `${prefix}${k}.`) };
    return { ...acc, [`${prefix}${k}`]: v };
  }, {});
