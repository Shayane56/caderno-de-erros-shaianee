import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  block?: boolean;
  children?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-rose-pink to-rose-deep text-white shadow-[0_6px_16px_-6px_rgba(219,39,119,0.55)] hover:brightness-105 active:brightness-95',
  secondary: 'bg-blush text-rose-ink hover:bg-petal',
  outline: 'border border-line bg-white text-ink hover:border-rose-medium hover:text-rose-ink',
  ghost: 'text-ink-muted hover:bg-blush hover:text-rose-ink',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-[0_6px_16px_-6px_rgba(220,38,38,0.5)]',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_6px_16px_-6px_rgba(22,163,74,0.5)]',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : Icon ? <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-[18px] w-[18px] shrink-0" aria-hidden /> : null}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'danger' | 'pink';
  size?: 'sm' | 'md';
}

export function IconButton({ icon: Icon, label, tone = 'default', size = 'md', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl transition disabled:opacity-50',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        tone === 'danger' && 'text-ink-muted hover:bg-red-50 hover:text-red-600',
        tone === 'default' && 'text-ink-muted hover:bg-blush hover:text-rose-ink',
        tone === 'pink' && 'bg-blush text-rose-pink hover:bg-petal',
        className,
      )}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} aria-hidden />
    </button>
  );
}
