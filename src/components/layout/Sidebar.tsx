import { NavLink } from 'react-router-dom';
import { Plus, ShieldCheck } from 'lucide-react';
import { NAV_ITEMS } from '@/constants/navigation';
import { Button } from '@/components/common/Button';
import { useErrorForm } from '@/components/modals/ErrorFormProvider';
import { cn } from '@/utils/cn';
import { BrandTitle } from './BrandMark';
import { SyncIndicator } from './SyncIndicator';

export function Sidebar({ pendingReviews, dueCards = 0 }: { pendingReviews: number; dueCards?: number }) {
  const { openCreate } = useErrorForm();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col border-r border-line bg-surface lg:flex" aria-label="Menu principal">
      <div className="px-6 pb-5 pt-7">
        <BrandTitle />
      </div>
      <div className="px-5">
        <Button block size="lg" icon={Plus} onClick={() => openCreate()}>
          Registrar novo erro
        </Button>
      </div>
      <nav className="scrollbar-soft mt-6 flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-medium transition',
                isActive ? 'bg-blush text-rose-ink' : 'text-ink-muted hover:bg-canvas hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition',
                    isActive ? 'bg-surface text-rose-pink shadow-soft' : 'text-rose-antique group-hover:text-rose-pink',
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="flex-1">{item.label}</span>
                {item.to === '/flashcards' && dueCards > 0 && (
                  <span className="rounded-full bg-rose-pink px-2 py-0.5 text-[11px] font-bold text-white" aria-label={`${dueCards} flashcards para hoje`}>
                    {dueCards}
                  </span>
                )}
                {item.to === '/segundo-ciclo' && pendingReviews > 0 && (
                  <span className="rounded-full bg-rose-pink px-2 py-0.5 text-[11px] font-bold text-white" aria-label={`${pendingReviews} erros para revisar`}>
                    {pendingReviews}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-3 border-t border-line p-5">
        <SyncIndicator className="w-full justify-start" />
        <p className="flex items-start gap-2 text-[11px] leading-snug text-ink-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-antique" aria-hidden />
          Seus dados ficam guardados neste dispositivo e funcionam sem internet.
        </p>
      </div>
    </aside>
  );
}
