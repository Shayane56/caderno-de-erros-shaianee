import { lazy, Suspense, useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { isIdentityId, type IdentityId } from './registry';
import { useDocumentIdentity } from './store';

const LOADERS = {
  editorial: () => import('./editorial/EditorialApp'),
  soft: () => import('./soft/SoftApp'),
  bold: () => import('./bold/BoldApp'),
} as const;

const APPS: Record<IdentityId, React.LazyExoticComponent<() => React.JSX.Element>> = {
  editorial: lazy(LOADERS.editorial),
  soft: lazy(LOADERS.soft),
  bold: lazy(LOADERS.bold),
};

const LOADER_BG: Record<IdentityId, string> = { editorial: '#F6F3EE', soft: '#F6F4FB', bold: '#EEEBE4' };

function Mounted({ id }: { id: IdentityId }) {
  useDocumentIdentity(id);
  // Carrega as outras duas em segundo plano: a troca pelo seletor fica instantânea.
  useEffect(() => {
    const t = window.setTimeout(() => Object.values(LOADERS).forEach((load) => void load()), 1200);
    return () => window.clearTimeout(t);
  }, []);
  const App = APPS[id];
  return (
    <Suspense fallback={<div className="min-h-dvh" style={{ background: LOADER_BG[id] }} aria-busy="true" aria-label="Carregando identidade" />}>
      <App />
    </Suspense>
  );
}

/** /identidades/:identity/* — demonstração navegável de uma identidade, com os dados reais. */
export default function IdentityApp() {
  const { identity } = useParams();
  if (!isIdentityId(identity)) return <Navigate to="/identidades" replace />;
  return <Mounted key={identity} id={identity} />;
}
