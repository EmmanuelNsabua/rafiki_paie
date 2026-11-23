import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full h-[1.571rem] px-[0.571rem] text-[0.857rem] font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[var(--primary-tint)] text-[var(--primary-strong)] font-semibold',
        secondary: 'bg-[var(--hover)] text-[var(--text-2)] font-medium',
        destructive: 'bg-[var(--danger-tint)] text-[var(--danger)] font-semibold',
        warning:
          'bg-[var(--warning-tint)] text-[var(--warning-text)] border border-[var(--warning-border)] font-medium',
        outline: 'border border-[var(--border)] text-[var(--text)] bg-[var(--surface)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
