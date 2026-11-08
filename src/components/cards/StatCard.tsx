import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { THEME, tint } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: ReactNode;
  /** Cor do marcador (ex.: cores de prioridade). */
  accent?: string;
  to?: string;
  children?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, hint, accent = THEME.pink, to, children, className }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold leading-snug text-ink-muted">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: tint(accent, 8), color: accent }}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-ink sm:text-[32px]">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-muted">{hint}</p>}
      {children}
      <span className="absolute inset-x-5 bottom-0 h-[3px] rounded-t-full opacity-80" style={{ backgroundColor: accent }} aria-hidden />
    </>
  );
  const classes = cn('card relative block overflow-hidden p-4 sm:p-5', to && 'transition hover:-translate-y-0.5 hover:shadow-lift', className);
  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
