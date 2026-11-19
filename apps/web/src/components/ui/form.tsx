import * as React from 'react';
import { useFormContext, Controller, type FieldValues, type FieldPath } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const Form = ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) => (
  <form {...props}>{children}</form>
);

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: React.ComponentProps<typeof Controller<TFieldValues, TName>>) {
  return <Controller {...props} />;
}

export function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-1.5', className)} {...props} />;
}

export function FormLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof Label>) {
  return <Label className={cn(className)} {...props} />;
}

export function FormControl({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function FormMessage({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null;
  return (
    <p className={cn('text-xs font-medium text-[var(--destructive)]', className)} {...props}>
      {children}
    </p>
  );
}
