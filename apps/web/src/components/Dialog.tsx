import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/** A centered modal on desktop and a bottom sheet on phones. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
        <RadixDialog.Content
          className={cn(
            'pop-in fixed z-50 flex max-h-[88dvh] flex-col border border-border bg-background shadow-xl outline-none',
            'inset-x-0 bottom-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)]',
            'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:pb-0',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
            <div className="min-w-0">
              <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close" className="-mr-2 -mt-1.5">
                <X className="size-4" />
              </Button>
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
