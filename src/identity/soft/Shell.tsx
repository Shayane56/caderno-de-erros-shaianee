import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, BookOpenCheck, ChevronRight, House, LayoutGrid, Layers, ListChecks, NotebookPen, Play, Settings, Timer, X, type LucideIcon } from 'lucide-react';
import { useFlashcardData, useStudyQueue } from '@/hooks/useFlashcards';
import { useProfile } from '@/services/profile';
import { cn } from '@/utils/cn';
import { identityPath } from '../registry';
import { activePrimary, MORE_NAV, PRIMARY_NAV, useIdentitySwitch, type MoreKey, type PrimaryKey } from '../shared/navigation';
import { SF_ICON } from './ui';

const ICONS: Record<PrimaryKey, LucideIcon> = { home: House, decks: Layers, review: BookOpenCheck, stats: BarChart3 };
const MORE_ICONS: Record<MoreKey, LucideIcon> = { focus: Timer, questions: ListChecks, errors: NotebookPen, settings: Settings };

/** Marca: dois arcos que formam um "m" sobre um bloco violeta. */
export function SoftLogo({ size = 36 }: { size?: number }) {
  return (
    <span className="flex items-center justify-center rounded-[12px] bg-sf-violet" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round">
        <path d="M4 18V11a4 4 0 0 1 8 0v7M12 11a4 4 0 0 1 8 0v7" />
      </svg>
    </span>
  );
}

function IdentitySwitch({ compact }: { compact?: boolean }) {
  const { options, current, switchTo } = useIdentitySwitch('soft');
  return (
    <div className={cn('flex rounded-xl bg-sf-lav-50 p-1', compact ? 'gap-0.5' : 'gap-1')} role="group" aria-label="Identidade visual">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => switchTo(o.id)}
          aria-pressed={current === o.id}
          title={`Proposta ${o.letter} — ${o.name}`}
          className={cn(
            'rounded-[9px] font-semibold transition-all duration-200',
            compact ? 'h-8 w-8 text-[12.5px]' : 'flex-1 px-2 py-1.5 text-[12.5px]',
            current === o.id ? 'bg-white text-sf-violet shadow-[0_1px_3px_rgb(43_37_64/0.12)]' : 'text-sf-muted hover:text-sf-plum',
          )}
        >
          {compact ? o.letter : o.name.split(' ')[0]}
          <span className="sr-only">{compact ? `: ${o.name}` : ` (proposta ${o.letter})`}</span>
        </button>
      ))}
    </div>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
      <button type="button" className="absolute inset-0 bg-sf-plum/25 backdrop-blur-[2px]" onClick={onClose} aria-label="Fechar" />
      <div className="sf-sheet relative w-full rounded-t-[28px] bg-white px-5 pb-[calc(1.5rem+var(--safe-bottom))] pt-3">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-sf-line" aria-hidden />
        <div className="flex items-center justify-between">
          <p className="text-[17px] font-semibold text-sf-plum">Mais</p>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-sf-muted hover:bg-sf-lav-50" aria-label="Fechar" autoFocus>
            <X {...SF_ICON} />
          </button>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {MORE_NAV.map((item) => {
            const Icon = MORE_ICONS[item.key];
            return (
              <li key={item.key}>
                <Link to={item.to} className="sf-press flex items-center gap-3 rounded-2xl bg-sf-mist p-3.5 text-[14px] font-semibold text-sf-plum">
                  <Icon {...SF_ICON} className="h-5 w-5 text-sf-violet" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mb-2 mt-5 text-[13px] font-semibold text-sf-muted">Identidade visual</p>
        <IdentitySwitch />
        <Link to="/identidades" className="mt-3 flex items-center justify-between rounded-2xl bg-sf-lav px-4 py-3 text-[14px] font-semibold text-sf-violet-deep">
          Comparar as três propostas <ChevronRight {...SF_ICON} className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function SoftShell() {
  const location = useLocation();
  const active = activePrimary(location.pathname);
  const [more, setMore] = useState(false);
  const { name } = useProfile();
  const data = useFlashcardData(60_000);
  const queue = useStudyQueue(data);
  const due = queue.counts.new + queue.counts.learning + queue.counts.review;
  const inReview = active === 'review' && location.pathname.split('/').length > 4;

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setMore(false);
  }, [location.pathname]);

  return (
    <div data-identity="soft" className="overflow-x-clip min-h-dvh bg-sf-mist font-sf text-sf-plum antialiased">
      <a href="#sf-conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>

      {/* Painel lateral (computador) */}
      <aside className="sf-surface fixed inset-y-4 left-4 z-30 hidden w-[248px] flex-col !rounded-[24px] p-4 lg:flex" aria-label="Menu principal">
        <Link to={identityPath('soft')} className="flex items-center gap-2.5 px-2 pt-1">
          <SoftLogo />
          <span className="text-[19px] font-semibold tracking-[-0.02em]">mimo</span>
        </Link>
        <nav className="mt-7 space-y-1" aria-label="Seções">
          {PRIMARY_NAV.map((item) => {
            const Icon = ICONS[item.key];
            const on = active === item.key;
            return (
              <NavLink
                key={item.key}
                to={identityPath('soft', item.screen)}
                aria-current={on ? 'page' : undefined}
                className={cn('flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-semibold transition-colors duration-200', on ? 'bg-sf-lav text-sf-violet-deep' : 'text-sf-muted hover:bg-sf-lav-50 hover:text-sf-plum')}
              >
                <Icon {...SF_ICON} className={cn('h-5 w-5', on ? 'text-sf-violet' : '')} />
                <span className="flex-1">{item.label}</span>
                {item.key === 'review' && due > 0 && <span className="sf-num rounded-full bg-sf-violet px-2 py-0.5 text-[11.5px] font-bold text-white">{due}</span>}
              </NavLink>
            );
          })}
        </nav>
        <p className="mb-1 mt-6 px-3 text-[12px] font-semibold text-sf-soft">No aplicativo atual</p>
        <nav className="space-y-0.5" aria-label="Mais">
          {MORE_NAV.map((item) => {
            const Icon = MORE_ICONS[item.key];
            return (
              <Link key={item.key} to={item.to} className="flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-sf-muted transition-colors hover:bg-sf-lav-50 hover:text-sf-plum">
                <Icon {...SF_ICON} className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-2xl bg-sf-mist p-3">
            <p className="mb-2 px-1 text-[12px] font-semibold text-sf-muted">Identidade visual</p>
            <IdentitySwitch />
            <Link to="/identidades" className="mt-2 flex items-center justify-between px-1 text-[12.5px] font-semibold text-sf-violet hover:text-sf-violet-deep">
              Comparar propostas <ChevronRight {...SF_ICON} className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex items-center gap-2.5 px-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sf-lav text-[13px] font-bold text-sf-violet-deep" aria-hidden>
              {(name || 'Você').slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 truncate text-[13.5px] font-semibold">{name || 'Seu perfil'}</span>
          </div>
        </div>
      </aside>

      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sf-mist/85 px-4 pb-2 pt-[calc(0.5rem+var(--safe-top))] backdrop-blur-md lg:hidden">
        <Link to={identityPath('soft')} className="flex items-center gap-2" aria-label="mimo — Início">
          <SoftLogo size={32} />
          <span className="text-[18px] font-semibold tracking-[-0.02em]">mimo</span>
        </Link>
        <IdentitySwitch compact />
      </header>

      <main id="sf-conteudo" className="px-4 pb-[calc(7.5rem+var(--safe-bottom))] pt-3 sm:px-6 lg:pb-12 lg:pl-[296px] lg:pr-10 lg:pt-8">
        <div className="mx-auto max-w-[1080px]">
          <Outlet />
        </div>
      </main>

      {/* Barra flutuante (celular) */}
      {!inReview && (
        <nav className="fixed inset-x-3 bottom-[calc(0.75rem+var(--safe-bottom))] z-40 lg:hidden" aria-label="Seções">
          <ul className="sf-surface flex h-[68px] items-center justify-around !rounded-[24px] px-1">
            {PRIMARY_NAV.filter((i) => i.key !== 'review')
              .slice(0, 2)
              .map((item) => (
                <TabItem key={item.key} to={identityPath('soft', item.screen)} icon={ICONS[item.key]} label={item.short} on={active === item.key} />
              ))}
            <li>
              <Link
                to={identityPath('soft', 'revisar/todos')}
                className="sf-press relative -mt-7 flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-sf-violet text-white shadow-[0_12px_24px_-10px_rgb(107_79_216/0.9)]"
                aria-label={due ? `Revisar ${due} cartões` : 'Revisar'}
              >
                <Play {...SF_ICON} className="h-6 w-6 translate-x-[1px]" fill="currentColor" />
                {due > 0 && <span className="sf-num absolute -right-1.5 -top-1.5 rounded-full bg-white px-1.5 text-[11px] font-bold text-sf-violet ring-2 ring-sf-violet">{due}</span>}
              </Link>
            </li>
            <TabItem to={identityPath('soft', 'estatisticas')} icon={BarChart3} label="Dados" on={active === 'stats'} />
            <li>
              <button type="button" onClick={() => setMore(true)} className="flex h-14 w-16 flex-col items-center justify-center gap-1 text-sf-muted" aria-haspopup="dialog">
                <LayoutGrid {...SF_ICON} />
                <span className="text-[11px] font-semibold">Mais</span>
              </button>
            </li>
          </ul>
        </nav>
      )}
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </div>
  );
}

function TabItem({ to, icon: Icon, label, on }: { to: string; icon: LucideIcon; label: string; on: boolean }) {
  return (
    <li>
      <Link to={to} aria-current={on ? 'page' : undefined} className={cn('flex h-14 w-16 flex-col items-center justify-center gap-1 transition-colors', on ? 'text-sf-violet' : 'text-sf-muted')}>
        <Icon {...SF_ICON} />
        <span className="text-[11px] font-semibold">{label}</span>
        <span className={cn('h-1 w-1 rounded-full transition-opacity', on ? 'bg-sf-violet opacity-100' : 'opacity-0')} aria-hidden />
      </Link>
    </li>
  );
}
