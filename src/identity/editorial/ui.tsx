import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Ícones finos (1,25 px) — o traço acompanha a serifa. */
export const ED_ICON = { strokeWidth: 1.25, className: 'h-[18px] w-[18px] shrink-0', 'aria-hidden': true } as const;

export function Kicker({ children, className, as: As = 'p' }: { children: ReactNode; className?: string; as?: 'p' | 'h2' | 'h3' | 'span' }) {
  return <As className={cn('ed-kicker text-ed-graphite', className)}>{children}</As>;
}

/** Cabeçalho de seção: número, título e fio de 1 px que se desenha ao aparecer. */
export function SectionHead({ number, title, aside, className, id }: { number: string; title: string; aside?: ReactNode; className?: string; id?: string }) {
  return (
    <div className={cn('mb-5', className)}>
      <div className="h-px bg-ed-ink ed-draw" aria-hidden />
      <div className="mt-2.5 flex items-baseline justify-between gap-4">
        <h2 id={id} className="flex items-baseline gap-3">
          <span className="ed-kicker ed-num text-ed-accent">§ {number}</span>
          <span className="ed-kicker text-ed-ink">{title}</span>
        </h2>
        {aside}
      </div>
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'quiet';

const variants: Record<Variant, string> = {
  primary: 'bg-ed-ink text-ed-paper hover:bg-ed-accent',
  secondary: 'border border-ed-ink text-ed-ink hover:bg-ed-ink hover:text-ed-paper',
  quiet: 'text-ed-ink hover:text-ed-accent',
};

const base =
  'group inline-flex h-11 select-none items-center justify-center gap-2.5 whitespace-nowrap px-5 font-ed-sans text-[13px] font-semibold tracking-[0.04em] transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40';

export const EdButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: LucideIcon; iconRight?: LucideIcon; block?: boolean }>(
  function EdButton({ variant = 'primary', icon: Icon, iconRight: IconRight, block, className, children, type = 'button', ...rest }, ref) {
    return (
      <button ref={ref} type={type} className={cn(base, variants[variant], block && 'w-full', className)} {...rest}>
        {Icon && <Icon {...ED_ICON} />}
        {children}
        {IconRight && <IconRight {...ED_ICON} className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />}
      </button>
    );
  },
);

export function EdLinkButton({ variant = 'primary', icon: Icon, iconRight: IconRight, className, children, ...rest }: LinkProps & { variant?: Variant; icon?: LucideIcon; iconRight?: LucideIcon }) {
  return (
    <Link className={cn(base, 'group', variants[variant], className)} {...rest}>
      {Icon && <Icon {...ED_ICON} />}
      {children}
      {IconRight && <IconRight {...ED_ICON} className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />}
    </Link>
  );
}

/** Algarismo grande com legenda (as "figuras" do relatório). */
export function Figure({ value, label, note, size = 'lg', accent }: { value: ReactNode; label: string; note?: ReactNode; size?: 'md' | 'lg' | 'xl'; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="ed-kicker text-ed-graphite">{label}</p>
      <p
        className={cn(
          'ed-serif ed-num mt-1 font-light leading-[0.95] tracking-[-0.02em]',
          size === 'xl' ? 'text-[64px] sm:text-[88px]' : size === 'lg' ? 'text-[44px] sm:text-[56px]' : 'text-[32px]',
          accent ? 'text-ed-accent' : 'text-ed-ink',
        )}
      >
        {value}
      </p>
      {note && <p className="mt-1.5 font-ed-sans text-[12.5px] text-ed-graphite">{note}</p>}
    </div>
  );
}

/** Medidor de 1 px com marcador (progresso, domínio). */
export function Meter({ value, label, tone = 'ink', className }: { value: number; label: string; tone?: 'ink' | 'accent' | 'moss'; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('relative h-[3px] bg-ed-rule', className)} role="meter" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn('absolute inset-y-0 left-0 ed-draw', tone === 'accent' ? 'bg-ed-accent' : tone === 'moss' ? 'bg-ed-moss' : 'bg-ed-ink')} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Delta({ value, suffix = '' }: { value: number | null; suffix?: string }) {
  if (value === null || value === 0) return null;
  return (
    <span className={cn('ed-num font-ed-sans text-[12px] font-semibold', value > 0 ? 'text-ed-moss' : 'text-ed-accent')}>
      {value > 0 ? '+' : '−'}
      {Math.abs(value)}
      {suffix}
    </span>
  );
}

export function Monogram({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('ed-serif inline-flex h-10 w-10 shrink-0 items-center justify-center border border-ed-ink text-[15px] italic text-ed-ink', className)} aria-hidden>
      {text}
    </span>
  );
}

/** Estado vazio no tom editorial: um parágrafo e uma ação, sem ilustração. */
export function EdEmpty({ kicker, title, children, action }: { kicker: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border-y border-ed-rule py-10 sm:py-14">
      <Kicker>{kicker}</Kicker>
      <p className="ed-serif mt-3 max-w-2xl text-[28px] font-light leading-[1.15] text-ed-ink sm:text-[36px]">{title}</p>
      {children && <div className="mt-3 max-w-xl font-ed-sans text-[15px] leading-relaxed text-ed-graphite">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PeriodTabs<T extends number>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="flex items-center gap-5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn('ed-link ed-num pb-0.5 font-ed-sans text-[13px] font-semibold transition-colors', value === o ? 'text-ed-ink [background-size:100%_1px]' : 'text-ed-graphite hover:text-ed-ink')}
        >
          {o} dias
        </button>
      ))}
    </div>
  );
}

/** Número por extenso para manchetes curtas ("doze cartões"). */
const WORDS = ['nenhum', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte'];
export function inWords(n: number): string {
  return n <= 20 ? WORDS[n] : n.toLocaleString('pt-BR');
}
