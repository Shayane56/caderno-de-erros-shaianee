import type { StudyQueue } from '@/services/flashcards/queue';
import { cn } from '@/utils/cn';

const ITEMS = [
  { key: 'new', label: 'novos', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  { key: 'learning', label: 'aprendendo', className: 'bg-red-50 text-red-700 ring-red-200' },
  { key: 'review', label: 'revisar', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
] as const;

/** Contadores do dia no estilo do Anki: novos · aprendendo · revisar. */
export function DueCounts({ counts, className, active, compact }: { counts: StudyQueue['counts']; className?: string; active?: keyof StudyQueue['counts']; compact?: boolean }) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {ITEMS.map((item) => (
        <span
          key={item.key}
          className={cn('chip tabular-nums', item.className, active === item.key && 'ring-2', active && active !== item.key && 'opacity-60')}
          aria-label={`${counts[item.key]} ${item.label}`}
        >
          <strong>{counts[item.key]}</strong>
          {!compact && <span className="font-medium">{item.label}</span>}
        </span>
      ))}
    </div>
  );
}

export function totalDue(counts: StudyQueue['counts']): number {
  return counts.new + counts.learning + counts.review;
}
