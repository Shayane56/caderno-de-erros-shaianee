import { Navigate, Route, Routes } from 'react-router-dom';
import './soft.css';
import { identityPath } from '../registry';
import { SoftShell } from './Shell';
import { SoftHome } from './Home';
import { SoftDeck, SoftDecks } from './Decks';
import { SoftReview } from './Review';
import { SoftStats } from './Stats';

/** Proposta B — Soft Modern. */
export default function SoftApp() {
  return (
    <Routes>
      <Route element={<SoftShell />}>
        <Route index element={<SoftHome />} />
        <Route path="baralhos" element={<SoftDecks />} />
        <Route path="baralhos/:deckId" element={<SoftDeck />} />
        <Route path="revisar/:deckId" element={<SoftReview />} />
        <Route path="estatisticas" element={<SoftStats />} />
        <Route path="*" element={<Navigate to={identityPath('soft')} replace />} />
      </Route>
    </Routes>
  );
}
