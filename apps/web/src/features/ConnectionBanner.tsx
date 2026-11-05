import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConnectionState } from '@/lib/connection';

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Appears only if the live connection has been down for a moment, then disappears on its own. */
export function ConnectionBanner() {
  const state = useConnectionState();
  const online = useOnline();
  const down = !online || state === 'closed';
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!down) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, [down]);

  if (!show) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-muted px-4 py-2 text-sm text-muted-foreground"
    >
      <WifiOff className="size-4" aria-hidden />
      {online ? 'Reconnecting…' : 'You’re offline. Messages will send when you’re back.'}
    </div>
  );
}
