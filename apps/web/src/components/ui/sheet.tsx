import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function Sheet({ open, children }: SheetProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[var(--card)] p-6 shadow-xl border border-[var(--border)] max-h-[90vh] overflow-y-auto">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)] sm:hidden" />
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 mb-4', className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'text-xl font-semibold leading-none tracking-tight text-[var(--foreground)]',
        className
      )}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-[var(--muted-foreground)]', className)} {...props} />;
}
