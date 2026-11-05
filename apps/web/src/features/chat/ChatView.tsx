import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { ArrowLeft, Info, MessageSquareOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar } from '@/components/Avatar';
import { Skeleton } from '@/components/Skeleton';
import { CONVERSATIONS, MARK_READ, MESSAGES, SEND_MESSAGE, SET_TYPING } from '@/lib/gql';
import { formatLastSeen } from '@/lib/time';
import { toast } from 'sonner';
import { getActiveConversation, setActiveConversation } from '../realtime/active';
import { applyMessage } from '../realtime/EventsProvider';
import { useTypingNames } from '../realtime/typing';
import { useViewer } from '../session/ViewerProvider';
import { Button } from '@/components/Button';
import { Composer } from './Composer';
import { GroupInfoDialog } from './GroupInfoDialog';
import { MessageList, type PendingMessage } from './MessageList';

const PAGE_SIZE = 30;
const TYPING_THROTTLE_MS = 2500;
let pendingCounter = 0;

const isWindowActive = () => document.visibilityState === 'visible' && document.hasFocus();

function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <MessageSquareOff className="size-5" />
      </div>
      <p className="font-medium">This conversation isn’t available</p>
      <p className="text-sm text-muted-foreground">
        It may have been deleted, or you’re no longer a member.
      </p>
      <Link to="/" className="text-sm font-medium text-brand hover:underline">
        Back to chats
      </Link>
    </div>
  );
}

export function ChatView() {
  const { id = '' } = useParams();
  // Remount per conversation so scroll position, drafts and pending sends never leak between chats.
  return <ChatScreen key={id} id={id} />;
}

function ChatScreen({ id }: { id: string }) {
  const viewer = useViewer();
  const client = useApolloClient();
  const [infoOpen, setInfoOpen] = useState(false);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const lastTypingPing = useRef(0);

  const { data: list, loading: listLoading } = useQuery(CONVERSATIONS, {
    fetchPolicy: 'cache-first',
  });
  const conversation = list?.conversations.find((c) => c.id === id);

  const { data, error, fetchMore, loading } = useQuery(MESSAGES, {
    variables: { conversationId: id, limit: PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    skip: !conversation,
  });
  const [sendMessage] = useMutation(SEND_MESSAGE);
  const [setTyping] = useMutation(SET_TYPING);
  const [markRead] = useMutation(MARK_READ);
  const [loadingMore, setLoadingMore] = useState(false);
  const typingNames = useTypingNames(id);

  // Tell the realtime layer which chat is open so incoming messages here count as read.
  useEffect(() => {
    setActiveConversation(id);
    return () => {
      if (getActiveConversation() === id) setActiveConversation(null);
    };
  }, [id]);

  // Mark as read while the chat is on screen and the window is active.
  const unread = conversation?.unreadCount ?? 0;
  const [active, setActive] = useState(isWindowActive);
  useEffect(() => {
    const update = () => setActive(isWindowActive());
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  useEffect(() => {
    if (unread > 0 && active)
      void markRead({ variables: { conversationId: id } }).catch(() => undefined);
  }, [unread, active, id, markRead]);

  const messages = useMemo(() => data?.messages.messages ?? [], [data]);
  const hasMore = data?.messages.hasMore ?? false;

  const loadMore = useCallback(() => {
    const oldest = messages[0];
    if (!oldest || loadingMore) return;
    setLoadingMore(true);
    fetchMore({ variables: { conversationId: id, before: oldest.id, limit: PAGE_SIZE } })
      .catch(() => toast.error('Couldn’t load earlier messages'))
      .finally(() => setLoadingMore(false));
  }, [messages, loadingMore, fetchMore, id]);

  async function dispatch(tempId: string, body: string) {
    try {
      const { data: sent } = await sendMessage({ variables: { conversationId: id, body } });
      if (sent) applyMessage(client, viewer.id, sent.sendMessage);
      setPending((p) => p.filter((x) => x.tempId !== tempId));
    } catch (err) {
      const message = (err as { graphQLErrors?: Array<{ message: string }> }).graphQLErrors?.[0]
        ?.message;
      if (message) toast.error(message);
      setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, status: 'failed' } : x)));
    }
  }

  // Sends are queued so messages reach the server in the order they were typed.
  const enqueue = (tempId: string, body: string) => {
    queue.current = queue.current.then(() => dispatch(tempId, body));
  };

  function send(body: string) {
    lastTypingPing.current = 0; // the next keystroke should announce typing again
    const tempId = `pending-${Date.now()}-${pendingCounter++}`;
    setPending((p) => [...p, { tempId, body, status: 'sending' }]);
    enqueue(tempId, body);
  }

  function retry(tempId: string) {
    const item = pending.find((p) => p.tempId === tempId);
    if (!item) return;
    setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, status: 'sending' } : x)));
    enqueue(tempId, item.body);
  }

  function typingPing() {
    const now = Date.now();
    if (now - lastTypingPing.current < TYPING_THROTTLE_MS) return;
    lastTypingPing.current = now;
    void setTyping({ variables: { conversationId: id } }).catch(() => undefined);
  }

  if (!conversation) {
    if (listLoading) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-border px-4">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      );
    }
    return <NotFound />;
  }

  const isGroup = conversation.type === 'GROUP';
  const peer = conversation.peer;
  const subtitle =
    typingNames.length > 0
      ? null
      : isGroup
        ? `${conversation.members.length} members`
        : peer?.online
          ? 'Online'
          : peer
            ? formatLastSeen(peer.lastSeenAt)
            : '';

  return (
    <section
      className="flex h-full min-h-0 flex-col"
      aria-label={`Chat with ${conversation.title}`}
    >
      <header className="flex h-16 shrink-0 items-center gap-1 border-b border-border bg-background px-2 pt-[env(safe-area-inset-top)] md:px-4">
        <Link
          to="/"
          aria-label="Back to chats"
          className="inline-flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted md:hidden"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <button
          type="button"
          disabled={!isGroup}
          onClick={() => setInfoOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1.5 text-left enabled:hover:bg-muted/60"
        >
          <Avatar
            name={conversation.title}
            color={peer?.avatarColor}
            online={peer?.online}
            group={isGroup}
          />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-tight">
              {conversation.title}
            </h1>
            <p className="truncate text-xs text-muted-foreground" aria-live="polite">
              {typingNames.length > 0 ? (
                <span className="text-brand">
                  {typingNames.length === 1
                    ? `${typingNames[0]} is typing`
                    : `${typingNames.length} people are typing`}
                  <span className="ml-0.5 inline-flex gap-0.5 align-middle" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-1 animate-bounce rounded-full bg-brand"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </span>
                </span>
              ) : (
                subtitle
              )}
            </p>
          </div>
        </button>
        {isGroup ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Group info"
            onClick={() => setInfoOpen(true)}
          >
            <Info className="size-5" />
          </Button>
        ) : null}
      </header>

      {error && !data ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-sm text-muted-foreground">Couldn’t load messages.</p>
          <Button
            variant="secondary"
            onClick={() => void client.refetchQueries({ include: ['Messages'] })}
          >
            Try again
          </Button>
        </div>
      ) : loading && !data ? (
        <div className="flex-1 space-y-3 p-6" aria-busy>
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="ml-auto h-9 w-2/5" />
          <Skeleton className="h-9 w-3/5" />
        </div>
      ) : messages.length === 0 && pending.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
          <Avatar name={conversation.title} color={peer?.avatarColor} group={isGroup} size="lg" />
          <p className="mt-2 font-medium">
            {isGroup ? `Welcome to ${conversation.title}` : `Say hi to ${conversation.title}`}
          </p>
          <p className="text-sm text-muted-foreground">Messages you send here show up instantly.</p>
        </div>
      ) : (
        <MessageList
          messages={messages}
          viewerId={viewer.id}
          isGroup={isGroup}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          pending={pending}
          onRetry={retry}
          onDiscard={(tempId) => setPending((p) => p.filter((x) => x.tempId !== tempId))}
        />
      )}

      <Composer
        onSend={send}
        onTyping={typingPing}
        placeholder={`Message ${isGroup ? conversation.title : conversation.title.split(' ')[0]}`}
      />

      {isGroup ? (
        <GroupInfoDialog conversation={conversation} open={infoOpen} onOpenChange={setInfoOpen} />
      ) : null}
    </section>
  );
}
