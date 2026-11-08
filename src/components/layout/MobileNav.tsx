import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Ellipsis, Plus } from 'lucide-react';
import { NAV_ITEMS } from '@/constants/navigation';
import { useErrorForm } from '@/components/modals/ErrorFormProvider';
import { Modal } from '@/components/common/Modal';
import { cn } from '@/utils/cn';
import { BrandTitle } from './BrandMark';
import { SyncIndicator } from './SyncIndicator';

const PRIMARY = ['/', '/erros', '/segundo-ciclo'];

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 pt-[var(--safe-top)] backdrop-blur-md lg:hidden">
      <div className="flex h-16 items-center justify-between gap-3 px-4">
        <BrandTitle compact />
        <SyncIndicator compact />
      </div>
    </header>
  );
}

export function BottomNav({ pendingReviews }: { pendingReviews: number }) {
  const { openCreate } = useErrorForm();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const secondary = NAV_ITEMS.filter((i) => !PRIMARY.includes(i.to));
  const moreActive = secondary.some((i) => location.pathname.startsWith(i.to));

  useEffect(() => setMoreOpen(false), [location.pathname]);

  const items = NAV_ITEMS.filter((i) => PRIMARY.includes(i.to));
  const linkClass = (active: boolean) =>
    cn('relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition', active ? 'text-rose-pink' : 'text-ink-muted');

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[var(--safe-bottom)] shadow-[0_-8px_24px_-12px_rgba(219,39,119,0.18)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex h-16 max-w-xl items-stretch px-2">
          {items.slice(0, 2).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => linkClass(isActive)}>
              <item.icon className="h-[22px] w-[22px]" aria-hidden />
              {item.shortLabel}
            </NavLink>
          ))}
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => openCreate()}
              aria-label="Registrar novo erro"
              className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-medium to-rose-pink text-white shadow-[0_10px_24px_-8px_rgba(219,39,119,0.7)] ring-4 ring-white transition active:scale-95"
            >
              <Plus className="h-7 w-7" aria-hidden />
            </button>
          </div>
          {items.slice(2).map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => linkClass(isActive)}>
              <span className="relative">
                <item.icon className="h-[22px] w-[22px]" aria-hidden />
                {pendingReviews > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-rose-pink px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                    {pendingReviews > 99 ? '99+' : pendingReviews}
                  </span>
                )}
              </span>
              {item.shortLabel}
            </NavLink>
          ))}
          <button type="button" onClick={() => setMoreOpen(true)} className={linkClass(moreActive)} aria-haspopup="dialog">
            <Ellipsis className="h-[22px] w-[22px]" aria-hidden />
            Mais
          </button>
        </div>
      </nav>
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais opções" size="sm">
        <div className="mb-4">
          <BrandTitle />
        </div>
        <ul className="space-y-1.5">
          {secondary.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn('flex items-center gap-3 rounded-2xl p-3 transition', isActive ? 'bg-blush text-rose-ink' : 'hover:bg-canvas')
                }
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blush text-rose-pink">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-ink">{item.label}</span>
                  <span className="block text-xs text-ink-muted">{item.description}</span>
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-5 border-t border-line pt-4">
          <SyncIndicator />
        </div>
      </Modal>
    </>
  );
}
