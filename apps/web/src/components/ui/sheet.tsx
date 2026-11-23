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

export function Sheet({ open, onOpenChange, children, width = 'w-[27.5rem]' }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        className={cn(
          'relative z-10 h-full max-w-full bg-[var(--surface)] p-6 shadow-2xl border-l border-[var(--border)] overflow-y-auto animate-in slide-in-from-right duration-250 flex flex-col',
          width
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange?.(false)}
          className="absolute top-5 right-5 p-2 rounded-[6px] text-[var(--text-2)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 mb-6 pr-8', className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-[1.625rem] font-semibold text-[var(--text)] leading-tight', className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-[1rem] text-[var(--text-2)]', className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-auto pt-6 border-t border-[var(--border)] flex justify-end gap-3', className)} {...props} />;
}
