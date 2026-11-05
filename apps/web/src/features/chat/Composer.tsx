import { SendHorizontal } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

const MAX_LENGTH = 4000;
const isTouchDevice = () =>
  typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export function Composer({
  onSend,
  onTyping,
  placeholder = 'Message',
}: {
  onSend: (body: string) => void;
  onTyping?: () => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0;

  // Grow with the content, up to roughly six lines, then scroll.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [value]);

  function submit() {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue('');
    ref.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends on desktop; on touch keyboards Enter inserts a new line (use the button).
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !isTouchDevice()) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t border-border bg-background px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
    >
      <textarea
        ref={ref}
        value={value}
        rows={1}
        maxLength={MAX_LENGTH}
        placeholder={placeholder}
        aria-label="Message"
        enterKeyHint="send"
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value) onTyping?.();
        }}
        onKeyDown={onKeyDown}
        className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl bg-muted px-4 py-[0.65rem] text-base leading-6 outline-none placeholder:text-muted-foreground md:min-h-10 md:py-2 md:text-sm"
      />
      <button
        type="submit"
        aria-label="Send message"
        disabled={!canSend}
        className={cn(
          'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-all md:size-10',
          canSend
            ? 'bg-brand text-brand-foreground hover:opacity-90'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <SendHorizontal className="size-[18px]" />
      </button>
    </form>
  );
}
