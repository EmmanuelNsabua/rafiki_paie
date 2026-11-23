'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  width?: string;
}

export function Dialog({
  open,
  onOpenChange,
  children,
  width = 'max-w-[30rem]',
}: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={() => onOpenChange?.(false)} />
      <div
        className={cn(
          'relative z-10 w-full rounded-[12px] bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)] animate-in zoom-in-95 duration-150',
          width
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange?.(false)}
          className="absolute top-5 right-5 p-1.5 rounded-[6px] text-[var(--text-2)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 mb-5 pr-8', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-[1.625rem] font-semibold text-[var(--text)] leading-tight', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-[1.0625rem] text-[var(--text-2)]', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-6 pt-4 border-t border-[var(--border)] flex justify-end gap-3', className)}
      {...props}
    />
  );
}
