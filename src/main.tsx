import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerServiceWorker } from '@/services/pwa';
import '@/services/install';
import { initAppearance } from '@/services/appearance';
import { updateDocumentTitle } from '@/services/profile';
import './styles/index.css';

// Tema e modo escuro antes da primeira renderização (evita piscar).
initAppearance();
updateDocumentTitle();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void registerServiceWorker();
