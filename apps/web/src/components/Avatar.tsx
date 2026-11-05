import { Users } from 'lucide-react';
import { cn } from '@/lib/cn';

const sizes = {
  sm: 'size-7 text-[11px]',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
} as const;

const dots = { sm: 'size-2', md: 'size-3', lg: 'size-3.5' } as const;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

export function Avatar({
  name,
  color,
  size = 'md',
  online,
  group,
  className,
}: {
  name: string;
  color?: string;
  size?: keyof typeof sizes;
  online?: boolean;
  group?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        aria-hidden
        className={cn(
          'inline-flex select-none items-center justify-center rounded-full font-semibold text-white',
          group && 'bg-muted text-muted-foreground',
          sizes[size],
        )}
        style={group ? undefined : { backgroundColor: color ?? '#71717a' }}
      >
        {group ? <Users className={size === 'sm' ? 'size-3.5' : 'size-[45%]'} /> : initials(name)}
      </span>
      {online ? (
        <span
          role="img"
          aria-label="Online"
          className={cn(
            'absolute bottom-0 right-0 rounded-full bg-online ring-2 ring-background',
            dots[size],
          )}
        />
      ) : null}
    </span>
  );
}
