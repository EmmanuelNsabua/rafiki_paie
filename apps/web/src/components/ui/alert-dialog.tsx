'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  actionText?: string;
  cancelText?: string;
  onAction: () => void;
  destructive?: boolean;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  actionText = 'Confirmer',
  cancelText = 'Annuler',
  onAction,
  destructive = false,
}: AlertDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-[30rem] rounded-[0.571rem] bg-[var(--surface)] p-[1.429rem] shadow-2xl border border-[var(--border)] animate-in zoom-in-95 duration-150">
        <h3 className="text-[1.143rem] font-semibold text-[var(--text)] leading-[1.714rem] mb-2">
          {title}
        </h3>
        <div className="text-[0.857rem] leading-[1.143rem] text-[var(--text-2)] mb-5">
          {description}
        </div>
        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            size="sm"
            onClick={() => {
              onAction();
              onOpenChange(false);
            }}
          >
            {actionText}
          </Button>
        </div>
      </div>
    </div>
  );
}
