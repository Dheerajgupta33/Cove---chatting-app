import xss from 'xss';

// Strips HTML tags from every string in the request body. We deliberately do NOT HTML-escape
// (escapeHtml is identity) because React escapes on render; escaping here would show "&lt;" to users.
const options = { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style'], escapeHtml: (s) => s };
const SKIP = new Set(['password', 'currentPassword', 'newPassword', 'credential', 'token']);

const clean = (value, key) => {
  if (typeof value === 'string') return SKIP.has(key) ? value : xss(value, options);
  if (Array.isArray(value)) return value.map((v) => clean(v, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v, k)]));
  }
  return value;
};

export const sanitizeBody = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  next();
};
