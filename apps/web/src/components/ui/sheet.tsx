'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  width?: string;
}

export function Sheet({ open, onOpenChange, children, width = 'w-[28.571rem]' }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={() => onOpenChange?.(false)} />
      <div
        className={cn(
          'relative z-10 h-full max-w-full bg-[var(--surface)] p-[1.429rem] shadow-2xl border-l border-[var(--border)] overflow-y-auto animate-in slide-in-from-right duration-250 flex flex-col',
          width
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange?.(false)}
          className="absolute top-4 right-4 p-1.5 rounded-[0.429rem] text-[var(--text-2)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1 mb-5 pr-8', className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'text-[1.143rem] font-semibold text-[var(--text)] leading-[1.714rem]',
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
  return (
    <p
      className={cn('text-[0.857rem] leading-[1.143rem] text-[var(--text-2)]', className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-auto pt-6 border-t border-[var(--border)] flex justify-end gap-3',
        className
      )}
      {...props}
    />
  );
}
