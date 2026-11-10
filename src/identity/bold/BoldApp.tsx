import { Navigate, Route, Routes } from 'react-router-dom';
import './bold.css';
import { identityPath } from '../registry';
import { BoldShell } from './Shell';
import { BoldHome } from './Home';
import { BoldDeck, BoldDecks } from './Decks';
import { BoldReview } from './Review';
import { BoldStats } from './Stats';

/** Proposta C — Bold Minimal. */
export default function BoldApp() {
  return (
    <Routes>
      <Route element={<BoldShell />}>
        <Route index element={<BoldHome />} />
        <Route path="baralhos" element={<BoldDecks />} />
        <Route path="baralhos/:deckId" element={<BoldDeck />} />
        <Route path="revisar/:deckId" element={<BoldReview />} />
        <Route path="estatisticas" element={<BoldStats />} />
        <Route path="*" element={<Navigate to={identityPath('bold')} replace />} />
      </Route>
    </Routes>
  );
}
