import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { InitialEntry } from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../App';
import type { AuthContextValue } from '../auth/AuthContext';
import { AuthContext } from '../auth/AuthContext';
import { theme } from '../theme';
import { fakeAuth } from './fakeAuth';

/** アプリの画面を、指定したパス・ログイン状態で描画する */
export function renderApp(path: InitialEntry, auth: AuthContextValue = fakeAuth()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider theme={theme}>
      <AuthContext.Provider value={auth}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
          </MemoryRouter>
        </QueryClientProvider>
      </AuthContext.Provider>
    </ThemeProvider>,
  );
}
