import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Ícones de traço médio e pontas arredondadas. */
export const SF_ICON = { strokeWidth: 1.75, className: 'h-5 w-5 shrink-0', 'aria-hidden': true } as const;

type Variant = 'primary' | 'soft' | 'ghost' | 'outline';
const variants: Record<Variant, string> = {
  primary: 'bg-sf-violet text-white shadow-[0_8px_20px_-10px_rgb(107_79_216/0.8)] hover:bg-sf-violet-deep',
  soft: 'bg-sf-lav text-sf-violet-deep hover:bg-[#E0D7FA]',
  ghost: 'text-sf-muted hover:bg-sf-lav-50 hover:text-sf-plum',
  outline: 'bg-white text-sf-plum ring-1 ring-sf-line hover:ring-sf-lilac',
};
const sizes = { md: 'h-11 px-5 text-[14.5px] rounded-xl gap-2', lg: 'h-[52px] px-6 text-[15.5px] rounded-2xl gap-2.5', sm: 'h-9 px-3.5 text-[13.5px] rounded-[10px] gap-1.5' };

type Common = { variant?: Variant; size?: keyof typeof sizes; icon?: LucideIcon; iconRight?: LucideIcon; block?: boolean };
const cls = (variant: Variant, size: keyof typeof sizes, block?: boolean, className?: string) =>
  cn('sf-press inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,box-shadow,transform,color] duration-200 disabled:cursor-not-allowed disabled:opacity-45', variants[variant], sizes[size], block && 'w-full', className);

export const SfButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & Common>(function SfButton(
  { variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, block, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cls(variant, size, block, className)} {...rest}>
      {Icon && <Icon {...SF_ICON} className="h-[18px] w-[18px]" />}
      {children}
      {IconRight && <IconRight {...SF_ICON} className="h-[18px] w-[18px]" />}
    </button>
  );
});

export function SfLinkButton({ variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, block, className, children, ...rest }: LinkProps & Common) {
  return (
    <Link className={cls(variant, size, block, className)} {...rest}>
      {Icon && <Icon {...SF_ICON} className="h-[18px] w-[18px]" />}
      {children}
      {IconRight && <IconRight {...SF_ICON} className="h-[18px] w-[18px]" />}
    </Link>
  );
}

export function Surface({ children, className, as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'aside' } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn('sf-surface', className)} {...rest}>
      {children}
    </As>
  );
}

export function SurfaceTitle({ title, hint, action, id }: { title: string; hint?: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 id={id} className="text-[16.5px] font-semibold tracking-[-0.01em] text-sf-plum">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-[13px] text-sf-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES = {
  violet: 'bg-sf-lav text-sf-violet-deep',
  mint: 'bg-sf-mint text-sf-mint-ink',
  peach: 'bg-sf-peach text-sf-peach-ink',
  sky: 'bg-sf-sky text-sf-sky-ink',
  rose: 'bg-sf-rose text-sf-rose-ink',
} as const;
export type Tone = keyof typeof TONES;

export function IconTile({ icon: Icon, tone = 'violet', className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONES[tone], className)}>
      <Icon {...SF_ICON} />
    </span>
  );
}

export function Chip({ children, tone = 'violet', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold', TONES[tone], className)}>{children}</span>;
}

export function Stat({ icon, tone, label, value, note }: { icon: LucideIcon; tone: Tone; label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <Surface as="div" className="flex items-center gap-3.5 p-4">
      <IconTile icon={icon} tone={tone} className="h-11 w-11 rounded-2xl" />
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-sf-muted">{label}</p>
        <p className="sf-num text-[24px] font-semibold leading-tight text-sf-plum">{value}</p>
        {note && <p className="text-[12px] text-sf-muted">{note}</p>}
      </div>
    </Surface>
  );
}

/** Anel de progresso com ponta arredondada. */
export function Ring({ value, size = 120, stroke = 10, label, children, track = '#ECE6FC', color = '#6B4FD8' }: { value: number; size?: number; stroke?: number; label: string; children?: ReactNode; track?: string; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.2,0.8,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Bar({ value, label, color = '#6B4FD8', className }: { value: number; label: string; color?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-sf-lav-50', className)} role="meter" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label, className }: { value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div className={cn('inline-flex rounded-xl bg-white p-1 ring-1 ring-sf-line', className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn('rounded-[9px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-200', value === o.id ? 'bg-sf-lav text-sf-violet-deep' : 'text-sf-muted hover:text-sf-plum')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Marca do baralho: monograma sobre a cor escolhida pela pessoa, em versão suave. */
export function DeckMark({ text, color, deep, size = 44 }: { text: string; color: string; deep: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[14px] text-[13px] font-bold tracking-[0.02em]"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 32%, white)`, color: deep }}
      aria-hidden
    >
      {text}
    </span>
  );
}

export function SfEmpty({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="sf-breathe absolute inset-0 rounded-full bg-sf-lav" aria-hidden />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-sf-lav text-sf-violet">
          <Icon {...SF_ICON} />
        </span>
      </span>
      <p className="mt-4 text-[17px] font-semibold text-sf-plum">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[14px] leading-relaxed text-sf-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageTitle({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="sf-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-[13px] font-semibold text-sf-violet">{eyebrow}</p>}
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.025em] text-sf-plum sm:text-[34px]">{title}</h1>
        {children && <p className="mt-1.5 max-w-xl text-[15px] text-sf-muted">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
