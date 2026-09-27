import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ApiCallError } from './api/client';
import { AuthProvider } from './auth/AuthProvider';
import { theme } from './theme';

const root = document.getElementById('root');
if (!root) {
  throw new Error('#root が見つかりません');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 通信できなかった場合だけ1回再試行する（業務エラー・認証エラーは再試行しても変わらない）
      retry: (failureCount, error) =>
        error instanceof ApiCallError && error.code === 'NETWORK_ERROR' && failureCount < 1,
    },
  },
});

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GoogleOAuthProvider clientId={import.meta.env.VITE_OAUTH_CLIENT_ID}>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
