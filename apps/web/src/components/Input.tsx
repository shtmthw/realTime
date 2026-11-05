import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const inputClass =
  'h-11 w-full rounded-xl border border-border bg-background px-3.5 text-base outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-brand md:h-10 md:text-sm';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(inputClass, invalid && 'border-danger focus:border-danger', className)}
      {...props}
    />
  );
});

/** Label + control + inline error, wired together for screen readers. */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  children: (props: { id: string; 'aria-describedby'?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-msg`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': error || hint ? messageId : undefined,
        invalid: Boolean(error),
      })}
      {error ? (
        <p id={messageId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
