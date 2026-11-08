import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/App';
import { AppRoutes } from '@/routes/AppRoutes';

/** Renderiza a aplicação completa (rotas + provedores) em uma rota inicial. */
export function renderApp(route = '/') {
  const user = userEvent.setup();
  const utils = render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  );
  return { user, ...utils };
}
