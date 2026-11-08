import { HashRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/common/Toast';
import { ErrorFormProvider } from '@/components/modals/ErrorFormProvider';
import { DatabaseGate } from '@/components/layout/DatabaseGate';
import { SyncProvider } from '@/hooks/useSync';
import { AppRoutes } from '@/routes/AppRoutes';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DatabaseGate>
        <SyncProvider>
          <ErrorFormProvider>{children}</ErrorFormProvider>
        </SyncProvider>
      </DatabaseGate>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </HashRouter>
  );
}
