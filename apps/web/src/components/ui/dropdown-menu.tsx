'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownMenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
  destructive?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactElement<any>;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = 'right',
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
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
            'absolute z-50 mt-1 min-w-[12.5rem] rounded-[8px] bg-[var(--surface)] p-1.5 shadow-lg border border-[var(--border)] animate-in fade-in zoom-in-95 duration-150',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={item.disabled}
              title={item.tooltip}
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled && item.onClick) {
                  item.onClick();
                  setOpen(false);
                }
              }}
              className={cn(
                'flex w-full items-center px-3 py-2 text-[1rem] rounded-[6px] text-left transition-colors cursor-pointer',
                item.disabled
                  ? 'opacity-40 cursor-not-allowed text-[var(--text-2)]'
                  : item.destructive
                    ? 'text-[var(--danger)] hover:bg-[var(--danger-tint)]'
                    : 'text-[var(--text)] hover:bg-[var(--hover)]'
              )}
            >
              {item.label}
              {item.tooltip && item.disabled && (
                <span className="ml-auto text-[0.75rem] text-[var(--text-2)] pl-2">
                  ({item.tooltip})
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
