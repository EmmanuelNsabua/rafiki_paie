'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
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

export function DropdownMenu({ trigger, items, align = 'right', className }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left?: number; right?: number }>({
    top: 0,
    right: 0,
  });

  const triggerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = React.useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;

    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 4;
    const estimatedHeight = items.length * 40 + 16;
    const estimatedWidth = 192; // 12rem

    let top = rect.bottom + margin;
    // Si déborde en bas de l'écran, afficher au-dessus du bouton
    if (top + estimatedHeight > window.innerHeight && rect.top - estimatedHeight - margin > 0) {
      top = rect.top - estimatedHeight - margin;
    }

    let left: number | undefined = undefined;
    let right: number | undefined = undefined;

    if (align === 'right') {
      right = Math.max(8, window.innerWidth - rect.right);
    } else {
      left = Math.min(Math.max(8, rect.left), window.innerWidth - estimatedWidth - 8);
    }

    setCoords({ top, left, right });
  }, [align, items.length]);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!open) {
      calculatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  return (
    <div className="inline-flex" ref={triggerRef}>
      {React.cloneElement(trigger, {
        onClick: toggleOpen,
        'aria-expanded': open,
      })}

      {open &&
        mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              ...(coords.right !== undefined
                ? { right: `${coords.right}px` }
                : { left: `${coords.left}px` }),
              zIndex: 99999,
            }}
            className={cn(
              'min-w-[12rem] rounded-[8px] bg-[#4d4d4d] text-[#f3f4f6] p-1.5 shadow-2xl border border-[#5c5c5c] animate-in fade-in zoom-in-95 duration-100 select-none pointer-events-auto',
              className
            )}
            onClick={(e) => e.stopPropagation()}
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
                  'flex w-full items-center px-3 py-2 text-[0.857rem] font-medium rounded-[6px] text-left transition-colors cursor-pointer',
                  item.disabled
                    ? 'opacity-40 cursor-not-allowed text-[#a3a3a3]'
                    : item.destructive
                      ? 'text-rose-400 hover:bg-rose-950/40'
                      : 'text-[#f3f4f6] hover:bg-white/10 hover:text-white'
                )}
              >
                {item.label}
                {item.tooltip && item.disabled && (
                  <span className="ml-auto text-[0.75rem] text-[#a3a3a3] pl-2">
                    ({item.tooltip})
                  </span>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
