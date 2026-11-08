import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, icon: Icon, actions, eyebrow }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && (
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-pink shadow-soft ring-1 ring-line sm:flex">
            <Icon className="h-6 w-6" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-rose-antique">{eyebrow}</p>}
          <h1 className="font-display text-[26px] font-semibold leading-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-ink-muted sm:text-[15px]">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
