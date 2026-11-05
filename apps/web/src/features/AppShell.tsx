import { useQuery } from '@apollo/client';
import { Settings, SquarePen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useMatch } from 'react-router';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/cn';
import { CONVERSATIONS } from '@/lib/gql';
import { ChatView } from './chat/ChatView';
import { ConnectionBanner } from './ConnectionBanner';
import { ConversationList } from './conversations/ConversationList';
import { NewChatDialog } from './conversations/NewChatDialog';
import { useViewer } from './session/ViewerProvider';
import { SettingsPage } from './settings/SettingsPage';

function EmptyState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <Logo size={56} />
      <h1 className="mt-2 text-lg font-semibold">Pick a conversation</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Choose a chat from the list, or start a new one with someone’s username.
      </p>
      <Button onClick={onNewChat} className="mt-2">
        <SquarePen className="size-4" /> New chat
      </Button>
      <p className="text-xs text-muted-foreground">
        or press{' '}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px]">
          Ctrl
        </kbd>{' '}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px]">
          K
        </kbd>
      </p>
    </div>
  );
}

export function AppShell() {
  const viewer = useViewer();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const inChat = useMatch('/c/:id');
  const inSettings = useMatch('/settings');
  const mainOnMobile = Boolean(inChat || inSettings);

  // Ctrl/⌘K opens the new-chat dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setNewChatOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Show the total unread count in the tab title.
  const { data } = useQuery(CONVERSATIONS, { fetchPolicy: 'cache-first' });
  const unread = data?.conversations.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Realtime` : 'Realtime';
    return () => {
      document.title = 'Realtime';
    };
  }, [unread]);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <aside
        className={cn(
          'w-full shrink-0 flex-col border-r border-border bg-surface md:flex md:w-80 lg:w-96',
          mainOnMobile ? 'hidden' : 'flex',
        )}
      >
        <header className="flex h-16 shrink-0 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
          <h1 className="text-xl font-semibold tracking-tight">Chats</h1>
          <Button
            variant="ghost"
            size="icon"
            aria-label="New chat"
            title="New chat (Ctrl+K)"
            onClick={() => setNewChatOpen(true)}
          >
            <SquarePen className="size-5" />
          </Button>
        </header>

        <ConversationList onNewChat={() => setNewChatOpen(true)} />

        <Link
          to="/settings"
          className="flex min-h-16 shrink-0 items-center gap-3 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] hover:bg-muted/60"
        >
          <Avatar name={viewer.displayName} color={viewer.avatarColor} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{viewer.displayName}</span>
            <span className="block truncate text-xs text-muted-foreground">@{viewer.username}</span>
          </span>
          <Settings className="size-4 text-muted-foreground" aria-label="Settings" />
        </Link>
      </aside>

      <main
        className={cn(
          'min-w-0 flex-1 flex-col bg-background md:flex',
          mainOnMobile ? 'flex' : 'hidden',
        )}
      >
        <ConnectionBanner />
        <div className="min-h-0 flex-1">
          <Routes>
            <Route path="/" element={<EmptyState onNewChat={() => setNewChatOpen(true)} />} />
            <Route path="/c/:id" element={<ChatView />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} />
    </div>
  );
}
