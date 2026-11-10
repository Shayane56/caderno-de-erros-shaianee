import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, BarChart3, BookOpen, Home, Layers, Menu, RotateCcw, X } from 'lucide-react';
import { useFlashcardData, useStudyQueue } from '@/hooks/useFlashcards';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { activePrimary, MORE_NAV, PRIMARY_NAV, useIdentitySwitch, type PrimaryKey } from '../shared/navigation';
import { dayOfYear } from '../model/home';
import { ED_ICON } from './ui';

const ICONS: Record<PrimaryKey, typeof Home> = { home: Home, decks: Layers, review: RotateCcw, stats: BarChart3 };

function Wordmark({ compact }: { compact?: boolean }) {
  return (
    <Link to={identityPath('editorial')} className="group flex items-baseline gap-2" aria-label="Mimo — Início">
      <span className={cn('ed-serif italic leading-none tracking-[-0.03em] text-ed-ink', compact ? 'text-[26px]' : 'text-[34px]')}>Mimo</span>
      {!compact && <span className="ed-kicker hidden text-ed-accent sm:inline">Edição de estudo</span>}
    </Link>
  );
}

/** Seletor A · B · C — troca a identidade sem sair da tela. */
function IdentityLetters({ className }: { className?: string }) {
  const { options, current, switchTo } = useIdentitySwitch('editorial');
  return (
    <div className={cn('flex items-center', className)} role="group" aria-label="Identidade visual">
      {options.map((o, i) => (
        <span key={o.id} className="flex items-center">
          {i > 0 && <span className="mx-1.5 h-3 w-px bg-ed-rule" aria-hidden />}
          <button
            type="button"
            onClick={() => switchTo(o.id)}
            aria-pressed={current === o.id}
            title={`Proposta ${o.letter} — ${o.name}`}
            className={cn(
              'ed-num px-1 py-1 font-ed-sans text-[12px] font-semibold tracking-[0.08em] transition-colors',
              current === o.id ? 'text-ed-accent' : 'text-ed-graphite hover:text-ed-ink',
            )}
          >
            <span aria-hidden>{o.letter}</span>
            <span className="sr-only">Proposta {o.letter}: {o.name}</span>
          </button>
        </span>
      ))}
    </div>
  );
}

function IndexSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { options, current, switchTo } = useIdentitySwitch('editorial');
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ed-paper ed-fade" role="dialog" aria-modal="true" aria-label="Índice">
      <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-4 sm:px-10">
        <div className="flex items-center justify-between border-b border-ed-ink pb-3">
          <Wordmark compact />
          <button type="button" onClick={onClose} className="flex h-11 items-center gap-2 font-ed-sans text-[13px] font-semibold text-ed-ink" autoFocus>
            Fechar <X {...ED_ICON} />
          </button>
        </div>
        <p className="ed-kicker mt-8 text-ed-graphite">Índice</p>
        <nav className="mt-3" aria-label="Seções">
          {PRIMARY_NAV.map((item, i) => (
            <Link key={item.key} to={identityPath('editorial', item.screen)} onClick={onClose} className="group flex items-baseline gap-4 border-b border-ed-rule py-4">
              <span className="ed-kicker ed-num w-8 text-ed-accent">{String(i + 1).padStart(2, '0')}</span>
              <span className="ed-serif text-[30px] font-light leading-none text-ed-ink transition-transform duration-500 group-hover:translate-x-1">{item.label}</span>
            </Link>
          ))}
        </nav>
        <p className="ed-kicker mt-10 text-ed-graphite">No aplicativo atual</p>
        <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
          {MORE_NAV.map((item) => (
            <li key={item.key}>
              <Link to={item.to} className="flex items-center justify-between border-b border-ed-rule py-3 font-ed-sans text-[15px] text-ed-ink hover:text-ed-accent">
                {item.label} <ArrowUpRight {...ED_ICON} className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="ed-kicker mt-10 text-ed-graphite">Identidade visual</p>
        <ul className="mt-2">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  switchTo(o.id);
                }}
                aria-pressed={current === o.id}
                className="flex w-full items-baseline gap-4 border-b border-ed-rule py-3 text-left"
              >
                <span className={cn('ed-kicker w-8', current === o.id ? 'text-ed-accent' : 'text-ed-graphite')}>{o.letter}</span>
                <span className={cn('ed-serif text-[22px]', current === o.id ? 'italic text-ed-accent' : 'text-ed-ink')}>{o.name}</span>
                <span className="ml-auto hidden font-ed-sans text-[12.5px] text-ed-graphite sm:block">{o.concept}</span>
              </button>
            </li>
          ))}
        </ul>
        <Link to="/identidades" className="ed-link mt-6 inline-block font-ed-sans text-[13px] font-semibold text-ed-ink">
          Comparar as três propostas
        </Link>
      </div>
    </div>
  );
}

export function EditorialShell() {
  const location = useLocation();
  const active = activePrimary(location.pathname);
  const [indexOpen, setIndexOpen] = useState(false);
  const data = useFlashcardData(60_000);
  const queue = useStudyQueue(data);
  const due = queue.counts.new + queue.counts.learning + queue.counts.review;
  const today = new Date();
  const dateLine = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const inReview = active === 'review' && location.pathname.split('/').length > 4;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div data-identity="editorial" className="overflow-x-clip min-h-dvh bg-ed-paper font-ed-sans text-ed-ink antialiased">
      <a href="#ed-conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ed-ink focus:px-4 focus:py-2 focus:text-ed-paper">
        Pular para o conteúdo
      </a>

      {/* Masthead */}
      <header className="mx-auto max-w-[1180px] px-5 pt-[calc(0.75rem+var(--safe-top))] sm:px-10 sm:pt-7">
        <div className="flex items-end justify-between gap-4 pb-3">
          <Wordmark compact={false} />
          <div className="hidden items-center gap-6 md:flex">
            <p className="ed-kicker ed-num text-ed-graphite">
              Nº {dayOfYear(today)} · {dateLine}
            </p>
            <IdentityLetters />
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <IdentityLetters />
            <button type="button" onClick={() => setIndexOpen(true)} className="-mr-2 flex h-11 w-11 items-center justify-center text-ed-ink" aria-label="Abrir índice">
              <Menu {...ED_ICON} className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="h-[2px] bg-ed-ink" aria-hidden />
        <nav className="hidden items-center justify-between border-b border-ed-rule md:flex" aria-label="Seções">
          <ul className="flex items-center gap-8">
            {PRIMARY_NAV.map((item) => (
              <li key={item.key}>
                <NavLink
                  to={identityPath('editorial', item.screen)}
                  end={item.key === 'home'}
                  aria-current={active === item.key ? 'page' : undefined}
                  className={cn('ed-link inline-flex h-12 items-center gap-2 text-[13.5px] font-semibold tracking-[0.02em]', active === item.key ? 'text-ed-accent' : 'text-ed-ink hover:text-ed-accent')}
                >
                  {item.label}
                  {item.key === 'review' && due > 0 && <span className="ed-num text-[11px] font-semibold text-ed-accent">{due}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setIndexOpen(true)} className="ed-link inline-flex h-12 items-center gap-2 text-[13.5px] font-semibold text-ed-graphite hover:text-ed-ink">
            <BookOpen {...ED_ICON} className="h-4 w-4" /> Índice
          </button>
        </nav>
      </header>

      <main id="ed-conteudo" className="mx-auto max-w-[1180px] px-5 pb-[calc(6rem+var(--safe-bottom))] pt-6 sm:px-10 sm:pt-10 md:pb-20">
        <Outlet />
      </main>

      <footer className="mx-auto hidden max-w-[1180px] px-10 pb-10 md:block">
        <div className="flex items-baseline justify-between border-t border-ed-ink pt-3">
          <p className="ed-kicker text-ed-graphite">Mimo · Proposta A — Editorial</p>
          <Link to="/identidades" className="ed-link ed-kicker text-ed-ink">
            Explorar identidades do Mimo
          </Link>
        </div>
      </footer>

      {/* Navegação inferior (celular) */}
      {!inReview && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ed-ink bg-ed-paper/95 pb-[var(--safe-bottom)] backdrop-blur md:hidden" aria-label="Seções">
          <ul className="grid grid-cols-4">
            {PRIMARY_NAV.map((item) => {
              const Icon = ICONS[item.key];
              const on = active === item.key;
              return (
                <li key={item.key}>
                  <Link to={identityPath('editorial', item.screen)} aria-current={on ? 'page' : undefined} className="relative flex h-[60px] flex-col items-center justify-center gap-1">
                    {on && <span className="absolute inset-x-5 top-0 h-[2px] bg-ed-accent ed-draw" aria-hidden />}
                    <span className="relative">
                      <Icon {...ED_ICON} className={cn('h-5 w-5', on ? 'text-ed-accent' : 'text-ed-ink')} />
                      {item.key === 'review' && due > 0 && <span className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-ed-accent" aria-label={`${due} para revisar`} />}
                    </span>
                    <span className={cn('text-[10.5px] font-semibold tracking-[0.06em]', on ? 'text-ed-accent' : 'text-ed-graphite')}>{item.short}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <IndexSheet open={indexOpen} onClose={() => setIndexOpen(false)} />
    </div>
  );
}
