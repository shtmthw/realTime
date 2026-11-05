import { ArrowDown, Loader2, RotateCcw, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { cn } from '@/lib/cn';
import { buildTimeline, type ChatMessage } from '@/lib/messages';
import { formatClock } from '@/lib/time';
import { Linkify } from './Linkify';

export interface PendingMessage {
  tempId: string;
  body: string;
  status: 'sending' | 'failed';
}

const NEAR_BOTTOM_PX = 120;

function Bubble({
  text,
  mine,
  first,
  last,
  muted,
}: {
  text: string;
  mine: boolean;
  first: boolean;
  last: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        'w-fit max-w-full whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-[1.4] md:text-sm',
        mine ? 'bg-brand text-brand-foreground' : 'bg-bubble',
        mine ? !first && 'rounded-tr-md' : !first && 'rounded-tl-md',
        mine ? !last && 'rounded-br-md' : !last && 'rounded-bl-md',
        muted && 'opacity-60',
      )}
    >
      <Linkify text={text} />
    </div>
  );
}

export function MessageList({
  messages,
  viewerId,
  isGroup,
  hasMore,
  loadingMore,
  onLoadMore,
  pending,
  onRetry,
  onDiscard,
}: {
  messages: ChatMessage[];
  viewerId: string;
  isGroup: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  pending: PendingMessage[];
  onRetry: (tempId: string) => void;
  onDiscard: (tempId: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const initialised = useRef(false);
  const lastSeenId = useRef<string | undefined>(undefined);
  const prepend = useRef<{ height: number; firstId: string | undefined } | null>(null);
  const [unseen, setUnseen] = useState(0);

  const timeline = useMemo(() => buildTimeline(messages, viewerId), [messages, viewerId]);

  const scrollToBottom = (smooth: boolean) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  // Keep the viewport sensible whenever the list changes.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const first = messages[0];
    const last = messages[messages.length - 1];

    // Older messages were added above: keep what the reader was looking at in place.
    if (prepend.current) {
      if (first?.id !== prepend.current.firstId)
        el.scrollTop += el.scrollHeight - prepend.current.height;
      prepend.current = null;
      lastSeenId.current = last?.id;
      return;
    }
    if (!initialised.current) {
      if (messages.length === 0) return;
      initialised.current = true;
      lastSeenId.current = last?.id;
      scrollToBottom(false);
      return;
    }
    if (last && last.id !== lastSeenId.current) {
      lastSeenId.current = last.id;
      if (last.sender.id === viewerId || stick.current) scrollToBottom(true);
      else setUnseen((n) => n + 1);
    }
  }, [messages, viewerId]);

  // Your own pending bubbles always scroll into view.
  useLayoutEffect(() => {
    if (pending.length > 0) scrollToBottom(true);
  }, [pending.length]);

  // Stay pinned to the bottom when the viewport resizes (e.g. the mobile keyboard opens).
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load older history when the top of the list comes into view.
  useEffect(() => {
    const el = scroller.current;
    const sentinel = topSentinel.current;
    if (!el || !sentinel || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore && initialised.current) {
          prepend.current = { height: el.scrollHeight, firstId: messages[0]?.id };
          onLoadMore();
        }
      },
      { root: el, rootMargin: '300px 0px 0px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore, messages]);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (stick.current) setUnseen(0);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="h-full overflow-y-auto px-3 py-4 md:px-6"
        role="log"
        aria-live="polite"
        aria-label="Messages"
      >
        <div ref={topSentinel} className="h-px" />
        {loadingMore ? (
          <div className="flex justify-center py-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-label="Loading earlier messages" />
          </div>
        ) : !hasMore && messages.length > 0 ? (
          <p className="pb-4 text-center text-xs text-muted-foreground">
            This is the start of the conversation
          </p>
        ) : null}

        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          {timeline.map((item) =>
            item.kind === 'day' ? (
              <div key={item.key} className="my-3 flex justify-center">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ) : (
              <div
                key={item.key}
                className={cn(
                  'mb-2 flex items-end gap-2',
                  item.mine ? 'justify-end' : 'justify-start',
                )}
              >
                {!item.mine && isGroup ? (
                  <Avatar
                    name={item.sender.displayName}
                    color={item.sender.avatarColor}
                    size="sm"
                    className="mb-5"
                  />
                ) : null}
                <div
                  className={cn(
                    'flex min-w-0 max-w-[80%] flex-col gap-0.5 md:max-w-[70%]',
                    item.mine ? 'items-end' : 'items-start',
                  )}
                >
                  {!item.mine && isGroup ? (
                    <span className="px-1 text-xs font-medium text-muted-foreground">
                      {item.sender.displayName}
                    </span>
                  ) : null}
                  {item.messages.map((m, i) => (
                    <Bubble
                      key={m.id}
                      text={m.body}
                      mine={item.mine}
                      first={i === 0}
                      last={i === item.messages.length - 1}
                    />
                  ))}
                  <time
                    dateTime={item.messages[item.messages.length - 1]!.createdAt}
                    className="px-1 text-[11px] text-muted-foreground"
                  >
                    {formatClock(item.messages[item.messages.length - 1]!.createdAt)}
                  </time>
                </div>
              </div>
            ),
          )}

          {pending.map((p) => (
            <div key={p.tempId} className="mb-2 flex flex-col items-end gap-0.5">
              <div className="max-w-[80%] md:max-w-[70%]">
                <Bubble text={p.body} mine first last muted={p.status === 'sending'} />
              </div>
              {p.status === 'failed' ? (
                <div className="flex items-center gap-1 px-1 text-xs text-danger" role="alert">
                  Not sent
                  <button
                    onClick={() => onRetry(p.tempId)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium hover:bg-danger/10"
                  >
                    <RotateCcw className="size-3" /> Retry
                  </button>
                  <button
                    onClick={() => onDiscard(p.tempId)}
                    aria-label="Discard message"
                    className="rounded-md p-1 hover:bg-danger/10"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <span className="px-1 text-[11px] text-muted-foreground">Sending…</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {unseen > 0 ? (
        <button
          onClick={() => {
            scrollToBottom(true);
            setUnseen(0);
          }}
          className="pop-in absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-sm font-medium text-brand-foreground shadow-lg"
        >
          <ArrowDown className="size-4" />
          {unseen === 1 ? '1 new message' : `${unseen} new messages`}
        </button>
      ) : null}
    </div>
  );
}
