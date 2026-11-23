'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: React.ReactElement<any>;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Popover({
  open: controlledOpen,
  onOpenChange,
  trigger,
  children,
  align = 'center',
  className,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const nextVal = typeof next === 'function' ? next(open) : next;
      if (!isControlled) {
        setUncontrolledOpen(nextVal);
      }
      onOpenChange?.(nextVal);
    },
    [isControlled, open, onOpenChange]
  );

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, setOpen]);

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }[align];

  return (
    <div className="relative inline-block" ref={containerRef}>
      {React.cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        },
        'aria-expanded': open,
      })}

      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 rounded-[8px] bg-[var(--surface)] p-4 shadow-xl border border-[var(--border)] animate-in fade-in zoom-in-95 duration-150',
            alignClasses,
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
