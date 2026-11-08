import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { Sidebar } from './Sidebar';
import { BottomNav, MobileHeader } from './MobileNav';
import { UpdatePrompt } from './UpdatePrompt';
import { WelcomeDialog } from './WelcomeDialog';
import { useFlashcardData, useStudyQueue } from '@/hooks/useFlashcards';
import { totalDue } from '@/components/flashcards/DueCounts';

export function AppLayout() {
  const location = useLocation();
  const pendingReviews = useLiveQuery(() => db.errors.where('priority').anyOf('alta', 'media').count(), []) ?? 0;
  const flashcards = useFlashcardData(60_000);
  const dueCards = totalDue(useStudyQueue(flashcards).counts);

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-xl bg-surface px-4 py-2 text-sm font-semibold text-rose-ink shadow-lift focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <Sidebar pendingReviews={pendingReviews} dueCards={dueCards} />
      <MobileHeader />
      <main id="conteudo" className="lg:pl-[272px]">
        <div className="mx-auto w-full max-w-7xl px-4 pb-[calc(6.5rem+var(--safe-bottom))] pt-5 sm:px-6 sm:pt-8 lg:px-10 lg:pb-12">
          <Outlet />
        </div>
      </main>
      <BottomNav pendingReviews={pendingReviews} dueCards={dueCards} />
      <UpdatePrompt />
      <WelcomeDialog />
    </div>
  );
}
