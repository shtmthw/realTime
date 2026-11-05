import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-foreground hover:opacity-90',
  secondary: 'bg-muted text-foreground hover:bg-border/60',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20',
};
const sizes: Record<Size, string> = {
  md: 'h-11 px-4 text-sm md:h-10',
  icon: 'size-11 md:size-9',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
