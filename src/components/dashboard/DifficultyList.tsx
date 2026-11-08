import { Link } from 'react-router-dom';
import type { GroupCount } from '@/utils/statistics';

interface DifficultyListProps {
  groups: GroupCount[];
  /** Monta o link para a lista filtrada. */
  linkFor: (group: GroupCount) => string;
  showSubject?: boolean;
}

/** Ranking de dificuldades com indicador de pendências por prioridade. */
export function DifficultyList({ groups, linkFor, showSubject }: DifficultyListProps) {
  const max = Math.max(1, ...groups.map((g) => g.pending));
  return (
    <ol className="space-y-2">
      {groups.map((g, i) => (
        <li key={g.id}>
          <Link to={linkFor(g)} className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-canvas">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-bold text-rose-pink">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold text-ink group-hover:text-rose-ink">{g.name}</p>
                <p className="shrink-0 text-xs text-ink-muted">
                  <span className="font-semibold text-ink">{g.pending}</span> pendente{g.pending === 1 ? '' : 's'}
                </p>
              </div>
              {showSubject && g.subjectName && <p className="truncate text-[11px] text-ink-muted">{g.subjectName}</p>}
              <div className="mt-1.5 flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-canvas" aria-hidden>
                <span className="h-full rounded-l-full bg-[#DC2626]" style={{ width: `${(g.alta / max) * 100}%` }} />
                <span className="h-full rounded-r-full bg-[#EDA100]" style={{ width: `${(g.media / max) * 100}%` }} />
              </div>
              <p className="sr-only">
                {g.alta} em prioridade alta e {g.media} em prioridade média
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
