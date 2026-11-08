import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/common/Spinner';

const DashboardPage = lazy(() => import('@/pages/Dashboard/DashboardPage'));
const MeusErrosPage = lazy(() => import('@/pages/MeusErros/MeusErrosPage'));
const ErrorDetailPage = lazy(() => import('@/pages/MeusErros/ErrorDetailPage'));
const SegundoCicloPage = lazy(() => import('@/pages/SegundoCiclo/SegundoCicloPage'));
const ReviewPage = lazy(() => import('@/pages/SegundoCiclo/ReviewPage'));
const MinhaEvolucaoPage = lazy(() => import('@/pages/MinhaEvolucao/MinhaEvolucaoPage'));
const MateriasTopicosPage = lazy(() => import('@/pages/MateriasTopicos/MateriasTopicosPage'));
const BackupConfiguracoesPage = lazy(() => import('@/pages/BackupConfiguracoes/BackupConfiguracoesPage'));
const FlashcardsPage = lazy(() => import('@/pages/Flashcards/FlashcardsPage'));
const DeckPage = lazy(() => import('@/pages/Flashcards/DeckPage'));
const StudyPage = lazy(() => import('@/pages/Flashcards/StudyPage'));
const QuestoesPage = lazy(() => import('@/pages/Questoes/QuestoesPage'));
const ResolverPage = lazy(() => import('@/pages/Questoes/ResolverPage'));
const FocoPage = lazy(() => import('@/pages/Foco/FocoPage'));
const EstatisticasPage = lazy(() => import('@/pages/Estatisticas/EstatisticasPage'));
const SimuladoPage = lazy(() => import('@/pages/Questoes/SimuladoPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFound/NotFoundPage'));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="erros" element={<MeusErrosPage />} />
          <Route path="erros/:id" element={<ErrorDetailPage />} />
          <Route path="segundo-ciclo" element={<SegundoCicloPage />} />
          <Route path="segundo-ciclo/revisar/:id" element={<ReviewPage />} />
          <Route path="flashcards" element={<FlashcardsPage />} />
          <Route path="flashcards/baralho/:id" element={<DeckPage />} />
          <Route path="flashcards/estudar/:deckId" element={<StudyPage />} />
          <Route path="questoes" element={<QuestoesPage />} />
          <Route path="questoes/resolver" element={<ResolverPage />} />
          <Route path="questoes/simulado" element={<SimuladoPage />} />
          <Route path="questoes/simulado/:id" element={<SimuladoPage />} />
          <Route path="foco" element={<FocoPage />} />
          <Route path="estatisticas" element={<EstatisticasPage />} />
          <Route path="evolucao" element={<MinhaEvolucaoPage />} />
          <Route path="materias" element={<MateriasTopicosPage />} />
          <Route path="backup" element={<BackupConfiguracoesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
