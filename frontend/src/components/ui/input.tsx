import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.ComponentProps<'input'>;

export function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-[var(--radius-md)] border border-fw-line-strong bg-fw-ink px-3 py-2 text-sm text-fw-paper placeholder:text-fw-fog',
        'transition-[border-color,background-color] duration-150',
        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fw-focus',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'fw-mono',
        className,
      )}
      {...props}
    />
  );
}
