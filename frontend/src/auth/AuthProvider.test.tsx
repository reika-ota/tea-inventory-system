import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../pages/LoginPage';
import { AuthProvider } from './AuthProvider';

// Google のスクリプトは読み込み済みとする
vi.mock('@react-oauth/google', () => ({
  useGoogleOAuth: () => ({ clientId: 'client-1', scriptLoadedSuccessfully: true }),
}));

/** google.accounts.id の呼び出し順を記録する偽物 */
function stubGoogleIdentity() {
  const calls: string[] = [];
  const id = {
    initialize: vi.fn(() => calls.push('initialize')),
    prompt: vi.fn(() => calls.push('prompt')),
    renderButton: vi.fn(() => calls.push('renderButton')),
    cancel: vi.fn(),
    disableAutoSelect: vi.fn(),
  };
  vi.stubGlobal('google', { accounts: { id } });
  return { calls, id };
}

describe('AuthProvider', () => {
  let google: ReturnType<typeof stubGoogleIdentity>;

  beforeEach(() => {
    google = stubGoogleIdentity();
  });

  afterEach(() => {
    cleanup(); // 画面の破棄（google.accounts.id.cancel）を、偽物を外す前に行う
    vi.unstubAllGlobals();
  });

  it('ログインボタンは初期化（initialize）の後に描画する', () => {
    // 子（LoginPage）の effect は親（AuthProvider）より先に動くため、初期化前に描画すると
    // ボタンが表示されない（One Tap を閉じた後にログインできなくなる不具合の再発防止）
    render(
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(google.id.renderButton).toHaveBeenCalled();
    const init = google.calls.indexOf('initialize');
    expect(init).toBeGreaterThanOrEqual(0);
    expect(google.calls.indexOf('renderButton')).toBeGreaterThan(init);
  });

  it('初期化の後にログイン画面を開いた場合（ログアウト後など）も、すぐにボタンを描画する', () => {
    const { rerender } = render(<AuthProvider>{null}</AuthProvider>);
    expect(google.id.renderButton).not.toHaveBeenCalled();
    rerender(
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(google.id.renderButton).toHaveBeenCalledTimes(1);
  });

  it('初期化の設定：自動ログイン、FedCM を使う', () => {
    render(<AuthProvider>{null}</AuthProvider>);
    expect(google.id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'client-1',
        auto_select: true,
        use_fedcm_for_prompt: true,
      }),
    );
    expect(google.id.prompt).toHaveBeenCalled();
  });
});
