import { format, isToday, isYesterday, isThisWeek, isThisYear, formatDistanceToNowStrict, differenceInMinutes } from 'date-fns';

const d = (v) => (v instanceof Date ? v : new Date(v));

export const messageTime = (v) => format(d(v), 'p'); // 9:41 AM

export const listTime = (v) => {
  const date = d(v);
  if (isToday(date)) return format(date, 'p');
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date)) return format(date, 'EEE');
  return format(date, isThisYear(date) ? 'MMM d' : 'MMM d, yyyy');
};

export const dayLabel = (v) => {
  const date = d(v);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, isThisYear(date) ? 'EEEE, MMMM d' : 'MMMM d, yyyy');
};

export const isSameDay = (a, b) => format(d(a), 'yyyy-MM-dd') === format(d(b), 'yyyy-MM-dd');
export const minutesBetween = (a, b) => Math.abs(differenceInMinutes(d(a), d(b)));

export const lastSeenLabel = (user) => {
  if (!user) return '';
  if (user.isBot) return 'AI assistant';
  if (user.isOnline) return 'Online';
  if (!user.lastSeen) return 'Offline';
  return `Last seen ${formatDistanceToNowStrict(d(user.lastSeen), { addSuffix: true })}`;
};

export const fullDate = (v) => format(d(v), 'PPp');
export const relative = (v) => formatDistanceToNowStrict(d(v), { addSuffix: true });
