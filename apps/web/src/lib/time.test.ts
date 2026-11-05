import { describe, expect, it } from 'vitest';
import { daysAgo, formatDayLabel, formatLastSeen, formatListTime } from './time';

const NOW = new Date(2025, 5, 11, 15, 30);
const local = (d: number, h = 12, m = 0, month = 5, year = 2025) =>
  new Date(year, month, d, h, m).toISOString();

describe('time formatting', () => {
  it('counts calendar days, not 24h blocks', () => {
    expect(daysAgo(new Date(2025, 5, 11, 0, 1), NOW)).toBe(0);
    expect(daysAgo(new Date(2025, 5, 10, 23, 59), NOW)).toBe(1);
  });

  it('formats the conversation list time', () => {
    expect(formatListTime(local(11, 9, 5), NOW)).toMatch(/9.*05/);
    expect(formatListTime(local(10), NOW)).toBe('Yesterday');
    expect(formatListTime(local(7), NOW)).not.toMatch(/Yesterday|Today/);
    expect(formatListTime(local(1, 12, 0, 4), NOW)).toMatch(/May/);
  });

  it('formats day separators', () => {
    expect(formatDayLabel(local(11), NOW)).toBe('Today');
    expect(formatDayLabel(local(10), NOW)).toBe('Yesterday');
    expect(formatDayLabel(local(1, 12, 0, 4, 2024), NOW)).toMatch(/2024/);
  });

  it('formats last seen', () => {
    expect(formatLastSeen(new Date(NOW.getTime() - 20_000).toISOString(), NOW)).toBe(
      'Last seen just now',
    );
    expect(formatLastSeen(new Date(NOW.getTime() - 5 * 60_000).toISOString(), NOW)).toBe(
      'Last seen 5 min ago',
    );
    expect(formatLastSeen(local(10), NOW)).toBe('Last seen yesterday');
  });
});
