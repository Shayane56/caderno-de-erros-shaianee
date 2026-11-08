import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { Sidebar } from './Sidebar';
import { BottomNav, MobileHeader } from './MobileNav';
import { UpdatePrompt } from './UpdatePrompt';

export function AppLayout() {
  const location = useLocation();
  const pendingReviews = useLiveQuery(() => db.errors.where('priority').anyOf('alta', 'media').count(), []) ?? 0;

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-ink shadow-lift focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <Sidebar pendingReviews={pendingReviews} />
      <MobileHeader />
      <main id="conteudo" className="lg:pl-[272px]">
        <div className="mx-auto w-full max-w-7xl px-4 pb-[calc(6.5rem+var(--safe-bottom))] pt-5 sm:px-6 sm:pt-8 lg:px-10 lg:pb-12">
          <Outlet />
        </div>
      </main>
      <BottomNav pendingReviews={pendingReviews} />
      <UpdatePrompt />
    </div>
  );
}
