import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useFlashcardData, useStudyQueue } from '@/hooks/useFlashcards';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { activePrimary, MORE_NAV, PRIMARY_NAV, useIdentitySwitch, type PrimaryKey } from '../shared/navigation';
import { BIcon, type BoldIconName } from './icons';

const ICONS: Record<PrimaryKey, BoldIconName> = { home: 'home', decks: 'decks', review: 'review', stats: 'stats' };

/** Monograma: "M" largo e pesado num quadrado ultravioleta. */
export function BoldMark({ size = 56 }: { size?: number }) {
  return (
    <span className="bd-black flex items-center justify-center bg-bd-uv text-white" style={{ width: size, height: size, fontSize: size * 0.5 }} aria-hidden>
      M
    </span>
  );
}

function Switcher({ vertical }: { vertical?: boolean }) {
  const { options, current, switchTo } = useIdentitySwitch('bold');
  return (
    <div className={cn('flex', vertical ? 'flex-col gap-1.5' : 'gap-1')} role="group" aria-label="Identidade visual">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => switchTo(o.id)}
          aria-pressed={current === o.id}
          title={`Proposta ${o.letter} — ${o.name}`}
          className={cn(
            'bd-mono flex h-9 w-9 items-center justify-center border-2 text-[12px] font-bold transition-colors',
            current === o.id ? 'border-bd-bone bg-bd-bone text-bd-ink' : 'border-bd-bone/30 text-bd-bone/70 hover:border-bd-bone hover:text-bd-bone',
          )}
        >
          {o.letter}
          <span className="sr-only">: {o.name}</span>
        </button>
      ))}
    </div>
  );
}

function MorePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bd-ink text-bd-bone lg:left-24" role="dialog" aria-modal="true" aria-label="Mais">
      <div className="flex items-center justify-between border-b-2 border-bd-bone/20 px-5 py-4 pt-[calc(1rem+var(--safe-top))]">
        <p className="bd-mono text-bd-bone/70">Mimo / Mais</p>
        <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center border-2 border-bd-bone" aria-label="Fechar" autoFocus>
          <BIcon name="close" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Mais">
        {MORE_NAV.map((item, i) => (
          <Link key={item.key} to={item.to} className="bd-up group flex items-center justify-between border-b-2 border-bd-bone/15 py-4" style={{ animationDelay: `${i * 40}ms` }}>
            <span className="flex items-baseline gap-4">
              <span className="bd-mono text-bd-signal">0{i + 1}</span>
              <span className="bd-wide text-[26px] uppercase transition-colors group-hover:text-bd-lav sm:text-[40px]">{item.label}</span>
            </span>
            <BIcon name="out" />
          </Link>
        ))}
        <Link to="/identidades" className="bd-hit mt-8 flex items-center justify-between border-2 border-bd-bone bg-bd-uv px-5 py-4">
          <span className="bd-wide text-[18px] uppercase">Comparar as 3 propostas</span>
          <BIcon name="arrow" />
        </Link>
      </nav>
    </div>
  );
}

export function BoldShell() {
  const location = useLocation();
  const active = activePrimary(location.pathname);
  const [more, setMore] = useState(false);
  const data = useFlashcardData(60_000);
  const queue = useStudyQueue(data);
  const due = queue.counts.new + queue.counts.learning + queue.counts.review;
  const inReview = active === 'review' && location.pathname.split('/').length > 4;
  const screenName = PRIMARY_NAV.find((i) => i.key === active)?.label ?? 'Início';

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setMore(false);
  }, [location.pathname]);

  return (
    <div data-identity="bold" className="overflow-x-clip min-h-dvh bg-bd-bone font-bd text-bd-ink antialiased">
      <a href="#bd-conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-bd-uv focus:px-4 focus:py-2 focus:text-white">
        Pular para o conteúdo
      </a>

      {/* Trilho lateral (computador) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-24 flex-col items-center bg-bd-ink py-5 text-bd-bone lg:flex" aria-label="Menu principal">
        <Link to={identityPath('bold')} aria-label="Mimo — Início">
          <BoldMark />
        </Link>
        <nav className="mt-8 flex w-full flex-col" aria-label="Seções">
          {PRIMARY_NAV.map((item) => {
            const on = active === item.key;
            return (
              <Link
                key={item.key}
                to={identityPath('bold', item.screen)}
                aria-current={on ? 'page' : undefined}
                className={cn('relative flex h-[76px] flex-col items-center justify-center gap-1.5 transition-colors', on ? 'bg-bd-uv text-white' : 'text-bd-bone/70 hover:bg-white/5 hover:text-bd-bone')}
              >
                <BIcon name={ICONS[item.key]} size={22} />
                <span className="bd-mono text-[9.5px]">{item.short}</span>
                {item.key === 'review' && due > 0 && <span className="bd-mono absolute right-3 top-2.5 bg-bd-signal px-1 text-[9.5px] font-bold text-bd-ink">{due}</span>}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMore(true)} className="flex h-[76px] flex-col items-center justify-center gap-1.5 text-bd-bone/70 transition-colors hover:bg-white/5 hover:text-bd-bone" aria-haspopup="dialog">
            <BIcon name="more" size={22} />
            <span className="bd-mono text-[9.5px]">Mais</span>
          </button>
        </nav>
        <div className="mt-auto">
          <Switcher vertical />
        </div>
      </aside>

      {/* Topo (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-bd-ink px-4 pb-2.5 pt-[calc(0.625rem+var(--safe-top))] text-bd-bone lg:hidden">
        <Link to={identityPath('bold')} className="flex items-center gap-3" aria-label="Mimo — Início">
          <BoldMark size={36} />
          <span className="bd-mono text-bd-bone/70">/ {screenName}</span>
        </Link>
        <Switcher />
      </header>

      <main id="bd-conteudo" className="px-4 pb-[calc(6.5rem+var(--safe-bottom))] pt-6 sm:px-8 lg:pb-16 lg:pl-[calc(6rem+3rem)] lg:pr-12 lg:pt-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 hidden items-center justify-between lg:flex">
            <p className="bd-mono text-bd-grey">
              Mimo / <span className="text-bd-ink">{screenName}</span>
            </p>
            <p className="bd-mono text-bd-grey">{new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).replace('.', '')} · Proposta C</p>
          </div>
          <Outlet />
        </div>
      </main>

      {/* Barra inferior (celular) */}
      {!inReview && (
        <nav className="fixed inset-x-0 bottom-0 z-40 bg-bd-ink pb-[var(--safe-bottom)] text-bd-bone lg:hidden" aria-label="Seções">
          <ul className="grid grid-cols-5">
            {PRIMARY_NAV.map((item) => {
              const on = active === item.key;
              return (
                <li key={item.key}>
                  <Link to={identityPath('bold', item.screen)} aria-current={on ? 'page' : undefined} className={cn('relative flex h-16 flex-col items-center justify-center gap-1', on ? 'bg-bd-uv text-white' : 'text-bd-bone/70')}>
                    <BIcon name={ICONS[item.key]} size={21} />
                    <span className="bd-mono text-[9px]">{item.short}</span>
                    {item.key === 'review' && due > 0 && <span className="bd-mono absolute right-2 top-1.5 bg-bd-signal px-1 text-[9px] font-bold text-bd-ink">{due}</span>}
                  </Link>
                </li>
              );
            })}
            <li>
              <button type="button" onClick={() => setMore(true)} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-bd-bone/70" aria-haspopup="dialog">
                <BIcon name="more" size={21} />
                <span className="bd-mono text-[9px]">Mais</span>
              </button>
            </li>
          </ul>
        </nav>
      )}
      <MorePanel open={more} onClose={() => setMore(false)} />
    </div>
  );
}
