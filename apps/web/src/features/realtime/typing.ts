import { useSyncExternalStore } from 'react';

const TYPING_MS = 3500;
const EMPTY: string[] = [];

interface Entry {
  name: string;
  timer: ReturnType<typeof setTimeout>;
}

const byConversation = new Map<string, Map<string, Entry>>();
const snapshots = new Map<string, string[]>();
const listeners = new Set<() => void>();

const emit = (conversationId: string) => {
  const entries = byConversation.get(conversationId);
  snapshots.set(
    conversationId,
    entries && entries.size > 0 ? [...entries.values()].map((e) => e.name) : EMPTY,
  );
  listeners.forEach((l) => l());
};

export function clearTyping(conversationId: string, userId: string) {
  const entries = byConversation.get(conversationId);
  const entry = entries?.get(userId);
  if (!entries || !entry) return;
  clearTimeout(entry.timer);
  entries.delete(userId);
  emit(conversationId);
}

export function markTyping(conversationId: string, userId: string, name: string) {
  let entries = byConversation.get(conversationId);
  if (!entries) byConversation.set(conversationId, (entries = new Map()));
  clearTimeout(entries.get(userId)?.timer);
  entries.set(userId, {
    name,
    timer: setTimeout(() => clearTyping(conversationId, userId), TYPING_MS),
  });
  emit(conversationId);
}

/** Display names of people currently typing in a conversation (stable reference until it changes). */
export const useTypingNames = (conversationId: string): string[] =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshots.get(conversationId) ?? EMPTY,
    () => EMPTY,
  );
