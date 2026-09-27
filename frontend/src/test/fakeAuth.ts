import { vi } from 'vitest';
import type { AuthContextValue } from '../auth/AuthContext';

/** テスト用のログイン状態（必要な項目だけ上書きして使う） */
export function fakeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'signedIn',
    email: 'taro@example.com',
    signOutReason: null,
    ready: true,
    getIdToken: vi.fn(() => 'token-1'),
    refreshIdToken: vi.fn(() => Promise.resolve('token-2')),
    signOut: vi.fn(),
    renderSignInButton: vi.fn(),
    ...overrides,
  };
}
