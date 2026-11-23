import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-[2.286rem] w-full rounded-[0.429rem] border border-[var(--border)] bg-[var(--surface)] px-[0.714rem] py-1 text-[1rem] transition-colors placeholder:text-[var(--text-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 text-[var(--text)]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
