import * as React from 'react';
import { cn } from '@/lib/utils';

export function StarclipLogo({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <img
      src="/logo-rafiki.jpg"
      alt="Logo École RAFIKI"
      className={cn('object-contain bg-white rounded-[0.286rem]', className)}
    />
  );
}
