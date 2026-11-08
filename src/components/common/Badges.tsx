import { PRIORITIES } from '@/constants/priorities';
import { getOriginMeta } from '@/constants/origins';
import type { OriginFilterValue, Priority, StoredOrigin } from '@/types';
import { cn } from '@/utils/cn';

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const meta = PRIORITIES[priority];
  return (
    <span className={cn('chip', meta.badgeClass, className)}>
      <span className={cn('h-2 w-2 rounded-full', meta.dotClass)} aria-hidden />
      {meta.label}
    </span>
  );
}

export function OriginBadge({ origin, className, short }: { origin: StoredOrigin | OriginFilterValue; className?: string; short?: boolean }) {
  const meta = getOriginMeta(origin);
  const Icon = meta.icon;
  return (
    <span className={cn('chip', meta.badgeClass, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden style={{ color: meta.color }} />
      {short && meta.id === 'confusao' ? 'Confusão' : short && meta.id === 'interpretacao' ? 'Interpretação' : meta.label}
    </span>
  );
}

export function OriginIcon({ origin, size = 'md' }: { origin: StoredOrigin | OriginFilterValue; size?: 'sm' | 'md' | 'lg' }) {
  const meta = getOriginMeta(origin);
  const Icon = meta.icon;
  const box = size === 'lg' ? 'h-11 w-11 rounded-2xl' : size === 'sm' ? 'h-7 w-7 rounded-lg' : 'h-9 w-9 rounded-xl';
  const icon = size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]';
  return (
    <span className={cn('flex shrink-0 items-center justify-center', box)} style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}>
      <Icon className={icon} aria-hidden />
    </span>
  );
}
