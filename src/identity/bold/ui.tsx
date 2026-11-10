import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { BIcon, type BoldIconName } from './icons';

type Variant = 'uv' | 'ink' | 'line' | 'signal';
const variants: Record<Variant, string> = {
  uv: 'bg-bd-uv text-white border-bd-ink hover:bg-bd-uv-deep',
  ink: 'bg-bd-ink text-bd-bone border-bd-ink',
  line: 'bg-bd-paper text-bd-ink border-bd-ink hover:bg-bd-lav',
  signal: 'bg-bd-signal text-bd-ink border-bd-ink',
};
type Common = { variant?: Variant; icon?: BoldIconName; iconRight?: BoldIconName; block?: boolean; size?: 'md' | 'lg' };
const cls = (variant: Variant, size: 'md' | 'lg', block?: boolean, className?: string) =>
  cn(
    'bd-hit inline-flex select-none items-center justify-center gap-3 whitespace-nowrap border-2 font-bd uppercase [font-stretch:115%] disabled:pointer-events-none disabled:opacity-40',
    size === 'lg' ? 'h-14 px-6 text-[14px] font-extrabold tracking-[0.02em]' : 'h-11 px-4 text-[12.5px] font-bold tracking-[0.03em]',
    variants[variant],
    block && 'w-full',
    className,
  );

export const BdButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & Common>(function BdButton(
  { variant = 'ink', size = 'md', icon, iconRight, block, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cls(variant, size, block, className)} {...rest}>
      {icon && <BIcon name={icon} size={18} />}
      {children}
      {iconRight && <BIcon name={iconRight} size={18} />}
    </button>
  );
});

export function BdLinkButton({ variant = 'ink', size = 'md', icon, iconRight, block, className, children, ...rest }: LinkProps & Common) {
  return (
    <Link className={cls(variant, size, block, className)} {...rest}>
      {icon && <BIcon name={icon} size={18} />}
      {children}
      {iconRight && <BIcon name={iconRight} size={18} />}
    </Link>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('bd-mono text-bd-grey', className)}>{children}</p>;
}

/** Título de página: palavra larga e pesada, com índice em mono. */
export function BdTitle({ index, title, children, actions }: { index: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="bd-up border-b-2 border-bd-ink pb-6">
      <Label>{index}</Label>
      <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="bd-black break-words text-[clamp(2.25rem,11vw,7rem)] uppercase">{title}</h1>
        {actions && <div className="flex flex-wrap gap-2 lg:pb-2">{actions}</div>}
      </div>
      {children && <p className="mt-4 max-w-2xl text-[16px] leading-snug text-bd-ink">{children}</p>}
    </header>
  );
}

export function SectionBar({ label, aside, id }: { label: string; aside?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-bd-ink pb-2">
      <h2 id={id} className="bd-wide text-[18px] uppercase sm:text-[22px]">
        {label}
      </h2>
      {aside}
    </div>
  );
}

/** Número gigante com etiqueta mono. */
export function Big({ value, label, tone = 'ink', size = 'lg', note }: { value: ReactNode; label: string; tone?: 'ink' | 'uv' | 'signal' | 'bone'; size?: 'md' | 'lg' | 'xl'; note?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className={cn('bd-mono', tone === 'bone' ? 'text-bd-bone/70' : 'text-bd-grey')}>{label}</p>
      <p
        className={cn(
          'bd-black mt-2',
          size === 'xl' ? 'text-[96px] sm:text-[168px]' : size === 'lg' ? 'text-[48px] sm:text-[64px]' : 'text-[34px] sm:text-[40px]',
          tone === 'uv' ? 'text-bd-uv' : tone === 'signal' ? 'text-bd-signal' : tone === 'bone' ? 'text-bd-bone' : 'text-bd-ink',
        )}
      >
        {value}
      </p>
      {note && <p className={cn('bd-mono mt-2 normal-case tracking-normal', tone === 'bone' ? 'text-bd-bone/70' : 'text-bd-grey')}>{note}</p>}
    </div>
  );
}

/** Barra grossa de 10 px, sem cantos. */
export function Thick({ value, label, color = '#0E0E10', track = '#CFCAC0', className }: { value: number; label: string; color?: string; track?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-2.5 w-full', className)} style={{ background: track }} role="meter" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="bd-wipe h-full" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

/** Círculo com número (contagem de hoje). */
export function Dot({ value, active, size = 48 }: { value: number; active: boolean; size?: number }) {
  return (
    <span
      className={cn('bd-black flex shrink-0 items-center justify-center rounded-full border-2 border-bd-ink text-[17px] tracking-[-0.02em]', active ? 'bg-bd-signal text-bd-ink' : 'bg-transparent text-bd-grey')}
      style={{ width: size, height: size }}
    >
      {value}
    </span>
  );
}

export function BdEmpty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="relative overflow-hidden border-2 border-bd-ink bg-bd-paper p-6 sm:p-10">
      <span className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-bd-lav" aria-hidden />
      <div className="relative">
        <p className="bd-wide max-w-xl text-[28px] uppercase sm:text-[40px]">{title}</p>
        {children && <p className="mt-3 max-w-lg text-[15px] leading-snug text-bd-grey">{children}</p>}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}

export function Toggle<T extends string | number>({ value, options, onChange, label }: { value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void; label: string }) {
  return (
    <div className="flex border-2 border-bd-ink" role="group" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={String(o.id)}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn('bd-mono h-10 whitespace-nowrap px-3.5 transition-colors', i > 0 && 'border-l-2 border-bd-ink', value === o.id ? 'bg-bd-ink text-bd-bone' : 'text-bd-ink hover:bg-bd-lav')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function pad(n: number, size = 2): string {
  return String(n).padStart(size, '0');
}
