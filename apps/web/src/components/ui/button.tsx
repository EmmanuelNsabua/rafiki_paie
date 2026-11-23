import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[6px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97] cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] font-semibold shadow-sm',
        destructive:
          'bg-[var(--danger)] text-white hover:opacity-90 font-semibold shadow-sm',
        outline:
          'border-2 border-[var(--primary)] text-[var(--primary-strong)] bg-transparent hover:bg-[var(--hover)] font-medium',
        secondary:
          'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--hover)] font-medium shadow-xs',
        ghost:
          'text-[var(--text-2)] hover:bg-[var(--hover)] hover:text-[var(--text)]',
        link: 'text-[var(--primary-strong)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[3.375rem] px-6 text-[1.25rem]',
        sm: 'h-[2.5rem] px-4 text-[1rem] rounded-[6px]',
        lg: 'h-[3.75rem] px-8 text-[1.375rem]',
        icon: 'h-[2.5rem] w-[2.5rem] p-0 rounded-[6px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
