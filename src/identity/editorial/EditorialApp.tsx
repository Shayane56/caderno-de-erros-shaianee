import { Navigate, Route, Routes } from 'react-router-dom';
import './editorial.css';
import { identityPath } from '../registry';
import { EditorialShell } from './Shell';
import { EditorialHome } from './Home';
import { EditorialDeck, EditorialDecks } from './Decks';
import { EditorialReview } from './Review';
import { EditorialStats } from './Stats';

/** Proposta A — Editorial. */
export default function EditorialApp() {
  return (
    <Routes>
      <Route element={<EditorialShell />}>
        <Route index element={<EditorialHome />} />
        <Route path="baralhos" element={<EditorialDecks />} />
        <Route path="baralhos/:deckId" element={<EditorialDeck />} />
        <Route path="revisar/:deckId" element={<EditorialReview />} />
        <Route path="estatisticas" element={<EditorialStats />} />
        <Route path="*" element={<Navigate to={identityPath('editorial')} replace />} />
      </Route>
    </Routes>
  );
}
