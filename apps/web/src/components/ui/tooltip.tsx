'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  delayMs?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  delayMs = 350,
  className,
}: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  };

  const handleFocus = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(true); // Immédiat au focus clavier
  };

  const handleBlur = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-3 py-1.5 text-[0.875rem] font-normal text-white bg-[#111111] rounded-[6px] shadow-lg pointer-events-none whitespace-normal max-w-xs text-center animate-in fade-in zoom-in-95 duration-150',
            className
          )}
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#111111]" />
        </div>
      )}
    </div>
  );
}
