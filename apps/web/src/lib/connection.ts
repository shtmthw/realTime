import { useSyncExternalStore } from 'react';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'closed';

let state: ConnectionState = 'idle';
let everConnected = false;
const listeners = new Set<() => void>();

export function setConnectionState(next: ConnectionState): { reconnected: boolean } {
  const reconnected = next === 'connected' && everConnected;
  if (next === 'connected') everConnected = true;
  if (next === 'idle') everConnected = false; // intentionally closed (e.g. signed out)
  if (state !== next) {
    state = next;
    listeners.forEach((l) => l());
  }
  return { reconnected };
}

export const useConnectionState = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => 'idle' as ConnectionState,
  );
