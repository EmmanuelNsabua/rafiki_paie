'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

type ToastListener = (toasts: ToastItem[]) => void;
let toasts: ToastItem[] = [];
const listeners: Set<ToastListener> = new Set();

function notifier() {
  listeners.forEach((l) => l([...toasts]));
}

const toastFn = (message: string, options?: any) => {
  return toast.info(message, options);
};
export const toast = Object.assign(toastFn, {
  custom: (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    options?: ToastOptions
  ) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, type, message, action: options?.action }];
    notifier();
    const duration = options?.duration ?? 4000;
    if (duration !== Infinity && duration > 0) {
      setTimeout(() => toast.dismiss(id), duration);
    }
    return id;
  },
  success: (message: string, options?: ToastOptions) => toast.custom(message, 'success', options),
  error: (
    message: string,
    actionOrOptions?: { label: string; onClick: () => void } | ToastOptions
  ) => {
    const opts: ToastOptions =
      actionOrOptions && 'label' in actionOrOptions
        ? { action: actionOrOptions, duration: 6000 }
        : (actionOrOptions as ToastOptions) || { duration: 6000 };
    return toast.custom(message, 'error', opts);
  },
  warning: (message: string, options?: ToastOptions) =>
    toast.custom(message, 'warning', { duration: 5000, ...options }),
  info: (message: string, options?: ToastOptions) => toast.custom(message, 'info', options),
  dismiss: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifier();
  },
});

export function Toaster() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-center justify-between p-4 rounded-[8px] border shadow-lg animate-in slide-in-from-bottom duration-200 bg-[var(--surface)]',
            t.type === 'success' && 'border-[var(--primary)] text-[var(--text)]',
            t.type === 'error' && 'border-[var(--danger)] text-[var(--text)]',
            t.type === 'warning' && 'border-[var(--warning-border)] text-[var(--text)]',
            t.type === 'info' && 'border-[var(--border)] text-[var(--text)]'
          )}
        >
          <div className="flex items-center gap-3">
            {t.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-[var(--primary-strong)] shrink-0" />
            )}
            {t.type === 'error' && <XCircle className="w-5 h-5 text-[var(--danger)] shrink-0" />}
            {t.type === 'warning' && (
              <AlertTriangle className="w-5 h-5 text-[var(--warning-text)] shrink-0" />
            )}
            {t.type === 'info' && <Info className="w-5 h-5 text-[var(--text-2)] shrink-0" />}
            <span className="text-[1rem] font-medium leading-snug">{t.message}</span>
          </div>
          <div className="flex items-center gap-2 pl-3">
            {t.action && (
              <button
                type="button"
                onClick={t.action.onClick}
                className="px-2.5 py-1 text-[0.875rem] font-semibold rounded-[4px] bg-[var(--hover)] hover:bg-[var(--border)] transition-colors cursor-pointer"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="p-1 rounded-[4px] text-[var(--text-2)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer"
              aria-label="Fermer la notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
