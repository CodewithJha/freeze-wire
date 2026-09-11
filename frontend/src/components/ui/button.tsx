import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-[color,background-color,border-color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fw-focus',
  {
    variants: {
      variant: {
        default:
          'bg-fw-paper text-fw-void hover:bg-fw-mist border border-transparent',
        secondary:
          'bg-transparent text-fw-paper border border-fw-line-strong hover:border-fw-mist hover:bg-fw-panel',
        ochre:
          'bg-fw-signal text-fw-void border border-fw-signal hover:opacity-90',
        signal:
          'bg-fw-signal text-fw-void border border-fw-signal hover:opacity-90',
        ghost: 'bg-transparent text-fw-mist hover:text-fw-paper hover:bg-fw-panel',
        danger:
          'bg-transparent text-fw-restricted border border-fw-restricted/40 hover:bg-fw-restricted/10',
      },
      size: {
        default: 'h-9 px-4 py-2 rounded-[var(--radius-md)]',
        sm: 'h-8 px-3 text-xs rounded-[var(--radius-sm)]',
        lg: 'h-10 px-5 rounded-[var(--radius-md)]',
        icon: 'h-8 w-8 rounded-[var(--radius-sm)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
