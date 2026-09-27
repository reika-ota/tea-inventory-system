import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from './App';
import type { AuthContextValue } from './auth/AuthContext';
import { AuthContext } from './auth/AuthContext';
import { fakeAuth } from './test/fakeAuth';

function renderAt(path: string, auth: AuthContextValue) {
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('認証ガード', () => {
  it('ログインしていなければログイン画面を表示し、Googleのボタンを描画する', () => {
    const auth = fakeAuth({ status: 'signedOut', email: null });
    renderAt('/', auth);
    expect(screen.getByRole('heading', { name: 'Chaicoss' })).toBeDefined();
    expect(auth.renderSignInButton).toHaveBeenCalled();
  });

  it('自動ログインを試行中も、ログイン画面とGoogleのボタンを表示する', () => {
    const auth = fakeAuth({ status: 'loading', email: null });
    renderAt('/', auth);
    expect(screen.getByRole('status').textContent).toBe('自動でログインしています…');
    expect(auth.renderSignInButton).toHaveBeenCalled();
  });

  it('ログイン後は、ログイン画面に移る前の画面に戻る', () => {
    const auth = fakeAuth();
    render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/' } }]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByText('ログイン中：taro@example.com')).toBeDefined();
  });

  it('ログイン済みならホームを表示する', () => {
    renderAt('/', fakeAuth());
    expect(screen.getByText('ログイン中：taro@example.com')).toBeDefined();
  });

  it('ログイン済みでログイン画面を開いた場合はホームへ移動する', () => {
    renderAt('/login', fakeAuth());
    expect(screen.getByText('ログイン中：taro@example.com')).toBeDefined();
  });
});

describe('ログイン画面の案内', () => {
  it('許可されていないアカウントの場合は、エラーを表示する', () => {
    renderAt('/login', fakeAuth({ status: 'signedOut', signOutReason: 'forbidden' }));
    expect(screen.getByRole('alert').textContent).toBe(
      'このアカウントは利用できません。登録済みの家族のアカウントでログインしてください。',
    );
  });

  it('理由がなければエラーを表示しない', () => {
    renderAt('/login', fakeAuth({ status: 'signedOut' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
