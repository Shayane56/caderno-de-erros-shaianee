import { Link, NavLink } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { NAV_ITEMS } from '@/constants/navigation';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { useErrorForm } from '@/components/modals/ErrorFormProvider';
import { useAvatarPhoto } from '@/hooks/useData';
import { useProfile } from '@/services/profile';
import { cn } from '@/utils/cn';
import { BrandTitle } from './BrandMark';
import { SyncIndicator } from './SyncIndicator';

export function Sidebar({ pendingReviews, dueCards = 0 }: { pendingReviews: number; dueCards?: number }) {
  const { openCreate } = useErrorForm();
  const photo = useAvatarPhoto();
  const { name } = useProfile();
  const badges: Record<string, number> = { '/segundo-ciclo': pendingReviews, '/flashcards': dueCards };
  return (
    <aside className="fixed inset-y-3 left-3 z-30 hidden w-[256px] flex-col rounded-[32px] border border-line/80 bg-surface/90 shadow-soft backdrop-blur-md lg:flex" aria-label="Menu principal">
      <div className="px-6 pb-4 pt-6">
        <BrandTitle />
      </div>
      <div className="px-4">
        <Button block icon={Plus} onClick={() => openCreate()}>
          Registrar novo erro
        </Button>
      </div>
      <nav className="scrollbar-soft mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const badge = badges[item.to] ?? 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-2xl px-3 py-2 text-[14.5px] font-semibold transition',
                  isActive ? 'bg-blush text-rose-ink' : 'text-ink-muted hover:bg-canvas hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-[19px] w-[19px] shrink-0 transition', isActive ? 'text-rose-pink' : 'text-ink-soft group-hover:text-rose-pink')} aria-hidden />
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge > 0 && (
                    <span className="rounded-full bg-rose-pink px-2 py-0.5 text-[11px] font-bold text-white" aria-label={`${badge} pendentes`}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-line p-3">
        <SyncIndicator className="w-full justify-start" />
        <Link to="/backup#personalizacao" className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-canvas">
          <Avatar photo={photo} size={42} className="ring-2" label={name ? `Avatar de ${name}` : 'Avatar'} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink">{name || 'Seu perfil'}</span>
            <span className="block text-[11px] text-ink-muted">Perfil e aparência</span>
          </span>
          <ChevronRight className="h-4 w-4 text-ink-soft" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
