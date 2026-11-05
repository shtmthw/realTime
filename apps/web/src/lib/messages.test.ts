import { describe, expect, it } from 'vitest';
import { buildTimeline, type ChatMessage } from './messages';

const alice = { id: 'a', displayName: 'Alice', avatarColor: '#000' };
const bob = { id: 'b', displayName: 'Bob', avatarColor: '#111' };
const msg = (id: string, sender: ChatMessage['sender'], iso: string): ChatMessage => ({
  id,
  body: id,
  sender,
  createdAt: iso,
});

// Use local-time constructors so day boundaries don't depend on the machine's timezone.
const at = (d: number, h: number, m: number) => new Date(2025, 5, d, h, m).toISOString();
const NOW = new Date(2025, 5, 11, 12, 0);

describe('buildTimeline', () => {
  it('returns nothing for no messages', () => {
    expect(buildTimeline([], 'a')).toEqual([]);
  });

  it('groups consecutive messages from one sender into a run under one day separator', () => {
    const items = buildTimeline(
      [msg('1', alice, at(11, 9, 0)), msg('2', alice, at(11, 9, 1)), msg('3', alice, at(11, 9, 2))],
      'a',
      NOW,
    );
    expect(items.map((i) => i.kind)).toEqual(['day', 'run']);
    expect(items[0]).toMatchObject({ label: 'Today' });
    expect(items[1]).toMatchObject({ mine: true });
    expect((items[1] as any).messages).toHaveLength(3);
  });

  it('starts a new run when the sender changes and marks who is "mine"', () => {
    const items = buildTimeline(
      [msg('1', alice, at(11, 9, 0)), msg('2', bob, at(11, 9, 1)), msg('3', alice, at(11, 9, 2))],
      'b',
      NOW,
    );
    const runs = items.filter((i) => i.kind === 'run') as any[];
    expect(runs.map((r) => [r.sender.id, r.mine])).toEqual([
      ['a', false],
      ['b', true],
      ['a', false],
    ]);
  });

  it('breaks a run after a pause of more than 5 minutes', () => {
    const items = buildTimeline(
      [
        msg('1', alice, at(11, 9, 0)),
        msg('2', alice, at(11, 9, 5)),
        msg('3', alice, at(11, 9, 11)),
      ],
      'a',
      NOW,
    );
    const runs = items.filter((i) => i.kind === 'run') as any[];
    expect(runs.map((r) => r.messages.length)).toEqual([2, 1]);
  });

  it('adds Today / Yesterday / date separators when the day changes, even for the same sender', () => {
    const items = buildTimeline(
      [
        msg('1', alice, at(1, 23, 59)),
        msg('2', alice, at(10, 23, 59)),
        msg('3', alice, at(11, 0, 1)),
      ],
      'a',
      NOW,
    );
    const days = items.filter((i) => i.kind === 'day').map((i) => (i as any).label);
    expect(days).toHaveLength(3);
    expect(days[1]).toBe('Yesterday');
    expect(days[2]).toBe('Today');
    expect(items.filter((i) => i.kind === 'run')).toHaveLength(3);
  });

  it('produces unique, stable keys', () => {
    const items = buildTimeline(
      [msg('1', alice, at(10, 9, 0)), msg('2', bob, at(11, 9, 0))],
      'a',
      NOW,
    );
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
  });
});
