import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAuth } from './test/fakeAuth';
import { setFakeApi } from './test/fakeApi';
import { renderApp } from './test/renderApp';
import { sampleData } from './test/sampleData';

vi.mock('./api/useApi', () => import('./test/fakeApi'));

beforeEach(() => {
  setFakeApi(() => sampleData);
});

describe('認証ガード', () => {
  it('ログインしていなければログイン画面を表示し、Googleのボタンを描画する', () => {
    const auth = fakeAuth({ status: 'signedOut', email: null });
    renderApp('/', auth);
    expect(screen.getByRole('heading', { name: 'Chaicoss' })).toBeDefined();
    expect(auth.renderSignInButton).toHaveBeenCalled();
  });

  it('自動ログインを試行中も、ログイン画面とGoogleのボタンを表示する', () => {
    const auth = fakeAuth({ status: 'loading', email: null });
    renderApp('/', auth);
    expect(screen.getByRole('status').textContent).toBe('自動でログインしています…');
    expect(auth.renderSignInButton).toHaveBeenCalled();
  });

  it('ログイン済みなら在庫一覧を表示する', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { name: '在庫' })).toBeDefined();
  });

  it('ログイン後は、ログイン画面に移る前の画面（絞り込みを含む）に戻る', async () => {
    renderApp({ pathname: '/login', state: { from: '/brands/kei' } });
    expect(await screen.findByRole('heading', { name: '桂花烏龍茶' })).toBeDefined();
  });

  it('集計・設定タブは仮画面を表示する', () => {
    renderApp('/settings');
    expect(screen.getByText('ログイン中：taro@example.com')).toBeDefined();
  });
});

describe('ログイン画面の案内', () => {
  it('許可されていないアカウントの場合は、エラーを表示する', () => {
    renderApp('/login', fakeAuth({ status: 'signedOut', signOutReason: 'forbidden' }));
    expect(screen.getByRole('alert').textContent).toBe(
      'このアカウントは利用できません。登録済みの家族のアカウントでログインしてください。',
    );
  });

  it('理由がなければエラーを表示しない', () => {
    renderApp('/login', fakeAuth({ status: 'signedOut' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
