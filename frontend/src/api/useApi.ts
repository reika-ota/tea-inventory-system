import { useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { CallApi } from './client';
import { createApiClient } from './client';

/** ログイン中のトークンで API を呼ぶ関数を返すフック */
export function useApi(): CallApi {
  const auth = useAuth();
  return useMemo(() => createApiClient({ url: import.meta.env.VITE_GAS_URL, auth }), [auth]);
}
