const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const DAY = 24 * 60 * 60 * 1000;

/** Whole calendar days between `d` and `now` (0 = today, 1 = yesterday). */
export const daysAgo = (d: Date, now = new Date()) =>
  Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / DAY);

const clock = (d: Date) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** "14:05" for messages. */
export const formatClock = (iso: string) => clock(new Date(iso));

/** Compact label for the conversation list: time today, "Yesterday", weekday, then date. */
export function formatListTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = daysAgo(d, now);
  if (days <= 0) return clock(d);
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Separator label between days inside a chat. */
export function formatDayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = daysAgo(d, now);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** "5 min ago" style text for presence. */
export function formatLastSeen(iso: string, now = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Last seen just now';
  if (min < 60) return `Last seen ${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24 && daysAgo(new Date(iso), now) === 0) return `Last seen ${hours} h ago`;
  const days = daysAgo(new Date(iso), now);
  if (days === 1) return `Last seen yesterday`;
  return `Last seen ${new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
