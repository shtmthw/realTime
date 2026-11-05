import { useQuery } from '@apollo/client';
import { MessageSquarePlus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import { Avatar } from '@/components/Avatar';
import { Skeleton } from '@/components/Skeleton';
import { cn } from '@/lib/cn';
import { CONVERSATIONS, type Conversation } from '@/lib/gql';
import { formatListTime } from '@/lib/time';
import { useViewer } from '../session/ViewerProvider';

function preview(c: Conversation, viewerId: string): string {
  const m = c.lastMessage;
  if (!m) return c.type === 'GROUP' ? 'Group created' : 'Say hello 👋';
  const who =
    m.sender.id === viewerId
      ? 'You: '
      : c.type === 'GROUP'
        ? `${m.sender.displayName.split(' ')[0]}: `
        : '';
  return who + m.body.replace(/\s+/g, ' ');
}

export function ConversationRow({ conversation: c }: { conversation: Conversation }) {
  const viewer = useViewer();
  const unread = c.unreadCount > 0;
  return (
    <NavLink
      to={`/c/${c.id}`}
      className={({ isActive }) =>
        cn(
          'mx-2 flex min-h-[4.25rem] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
          isActive ? 'bg-muted' : 'hover:bg-muted/60',
        )
      }
    >
      <Avatar
        name={c.title}
        color={c.peer?.avatarColor}
        online={c.peer?.online}
        group={c.type === 'GROUP'}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-[15px]', unread ? 'font-semibold' : 'font-medium')}>
            {c.title}
          </span>
          <span
            className={cn(
              'shrink-0 text-xs',
              unread ? 'font-medium text-brand' : 'text-muted-foreground',
            )}
          >
            {formatListTime(c.lastMessage?.createdAt ?? c.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn('truncate text-sm', unread ? 'text-foreground' : 'text-muted-foreground')}
          >
            {preview(c, viewer.id)}
          </span>
          {unread ? (
            <span
              aria-label={`${c.unreadCount} unread`}
              className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-brand-foreground"
            >
              {c.unreadCount > 99 ? '99+' : c.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </NavLink>
  );
}

export function ConversationList({ onNewChat }: { onNewChat: () => void }) {
  const { data, loading, error, refetch } = useQuery(CONVERSATIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const [filter, setFilter] = useState('');

  const sorted = useMemo(
    () =>
      [...(data?.conversations ?? [])].sort((a, b) =>
        b.lastMessageAt.localeCompare(a.lastMessageAt),
      ),
    [data],
  );
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q
      ? sorted.filter((c) => c.title.toLowerCase().includes(q) || c.peer?.username.includes(q))
      : sorted;
  }, [sorted, filter]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pb-2 pt-1">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="h-10 w-full rounded-xl bg-muted pl-9 pr-3 text-base outline-none placeholder:text-muted-foreground md:h-9 md:text-sm"
          />
        </div>
      </div>

      <nav aria-label="Conversations" className="min-h-0 flex-1 overflow-y-auto pb-2">
        {loading && !data ? (
          <div className="space-y-1 px-4 pt-2" aria-busy>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error && !data ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Couldn’t load your chats.{' '}
            <button
              className="font-medium text-brand underline-offset-2 hover:underline"
              onClick={() => void refetch()}
            >
              Try again
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-14 text-center">
            <div className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <MessageSquarePlus className="size-5" />
            </div>
            <p className="font-medium">No chats yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Find someone by username to start talking.
            </p>
            <button
              onClick={onNewChat}
              className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
            >
              Start a chat
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            No chats match “{filter}”.
          </p>
        ) : (
          visible.map((c) => <ConversationRow key={c.id} conversation={c} />)
        )}
      </nav>
    </div>
  );
}
