import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...rest} />;
}

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SectionCard({ title, subtitle, icon: Icon, action, children, className, bodyClassName }: SectionCardProps) {
  return (
    <section className={cn('card flex flex-col p-5 sm:p-6', className)} aria-label={title}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blush text-rose-pink">
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="section-title leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className={cn('min-w-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  );
}
