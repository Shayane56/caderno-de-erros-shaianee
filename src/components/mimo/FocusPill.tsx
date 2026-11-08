import { Link, useLocation } from 'react-router-dom';
import { Pause, Play, Timer } from 'lucide-react';
import { formatClock, useFocus } from '@/services/study/focusTimer';

/** Cronômetro flutuante do Modo Foco (aparece em todas as telas enquanto há uma sessão). */
export function FocusPill() {
  const { timer, remaining, running, pause, resume } = useFocus();
  const { pathname } = useLocation();
  if (!timer || pathname === '/foco') return null;
  return (
    <div className="fixed bottom-[calc(5.5rem+var(--safe-bottom))] right-4 z-40 flex items-center gap-1 rounded-full bg-surface/95 p-1.5 pl-3 shadow-lift ring-1 ring-line backdrop-blur-md lg:bottom-6 lg:right-6" role="status" aria-label="Sessão de foco em andamento">
      <Link to="/foco" className="flex items-center gap-2 pr-1 text-sm font-bold text-ink">
        <Timer className="h-4 w-4 text-rose-pink" aria-hidden />
        <span className="tabular-nums">{formatClock(remaining)}</span>
        {!running && <span className="text-xs font-semibold text-ink-muted">pausado</span>}
      </Link>
      <button
        type="button"
        onClick={running ? pause : resume}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-blush text-rose-ink transition hover:bg-petal"
        aria-label={running ? 'Pausar foco' : 'Retomar foco'}
      >
        {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
