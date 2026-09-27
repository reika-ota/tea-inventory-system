// Googleログイン（詳細設計 7.1）。
// @react-oauth/google の GoogleOAuthProvider が読み込んだ Google Identity Services を直接使い、
// 自動ログイン・ボタン・トークン再取得を1か所の設定（initialize）でまとめて扱う。
import { useGoogleOAuth } from '@react-oauth/google';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthContextValue, AuthStatus, SignOutReason } from './AuthContext';
import { AuthContext } from './AuthContext';
import { decodeIdToken } from './idToken';

/** 自動ログイン・再取得を待つ上限（Google の画面が表示されない場合に備える） */
const PROMPT_TIMEOUT_MS = 10_000;

interface Waiter {
  resolve(token: string): void;
  reject(error: Error): void;
}

/** 自動ログイン（One Tap）を表示する。ログインせずに閉じられたら onFail を呼ぶ */
function promptSignIn(onFail: () => void): void {
  google.accounts.id.prompt((notification) => {
    const dismissed =
      notification.isDismissedMoment() &&
      notification.getDismissedReason() !== 'credential_returned';
    if (notification.isSkippedMoment() || dismissed) onFail();
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { clientId, scriptLoadedSuccessfully } = useGoogleOAuth();
  // IDトークンはメモリ上（ref）だけに保持し、localStorage などには保存しない
  const tokenRef = useRef<string | null>(null);
  const waitersRef = useRef<Waiter[]>([]);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [signOutReason, setSignOutReason] = useState<SignOutReason>(null);

  /** トークンの再取得を待っている処理に結果を返す */
  const settleWaiters = useCallback((settle: (waiter: Waiter) => void) => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    waiters.forEach(settle);
  }, []);

  const failWaiters = useCallback(
    () => settleWaiters((w) => w.reject(new Error('ログインし直せませんでした'))),
    [settleWaiters],
  );

  // Google のスクリプトを読み込んだら初期化し、自動ログインを試みる
  useEffect(() => {
    if (!scriptLoadedSuccessfully) return;
    google.accounts.id.initialize({
      client_id: clientId,
      auto_select: true, // 前回ログインしたアカウントで自動ログインする
      cancel_on_tap_outside: false,
      use_fedcm_for_prompt: true,
      callback: ({ credential }) => {
        const claims = decodeIdToken(credential);
        if (!claims) return;
        tokenRef.current = credential;
        setEmail(claims.email);
        setSignOutReason(null);
        setStatus('signedIn');
        settleWaiters((w) => w.resolve(credential));
      },
    });
    promptSignIn(() => setStatus((s) => (s === 'loading' ? 'signedOut' : s)));
    return () => google.accounts.id.cancel();
  }, [clientId, scriptLoadedSuccessfully, settleWaiters]);

  // スクリプトの読み込みに失敗した場合なども、一定時間でログイン画面に切り替える
  useEffect(() => {
    const timer = setTimeout(
      () => setStatus((s) => (s === 'loading' ? 'signedOut' : s)),
      PROMPT_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  const getIdToken = useCallback(() => tokenRef.current, []);

  const refreshIdToken = useCallback(
    () =>
      new Promise<string>((resolve, reject) => {
        if (!scriptLoadedSuccessfully) {
          reject(new Error('ログインの準備ができていません'));
          return;
        }
        waitersRef.current.push({ resolve, reject });
        // 同時に複数のリクエストが再取得を求めても、Google の画面は1回だけ出す
        if (waitersRef.current.length === 1) {
          promptSignIn(failWaiters);
          setTimeout(failWaiters, PROMPT_TIMEOUT_MS);
        }
      }),
    [scriptLoadedSuccessfully, failWaiters],
  );

  const signOut = useCallback(
    (reason: SignOutReason = null) => {
      tokenRef.current = null;
      if (scriptLoadedSuccessfully) {
        // 次回、同じアカウントで自動ログインしないようにする
        google.accounts.id.disableAutoSelect();
      }
      setEmail(null);
      setSignOutReason(reason);
      setStatus('signedOut');
    },
    [scriptLoadedSuccessfully],
  );

  const renderSignInButton = useCallback(
    (element: HTMLElement) => {
      if (!scriptLoadedSuccessfully) return;
      google.accounts.id.renderButton(element, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        locale: 'ja',
      });
    },
    [scriptLoadedSuccessfully],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      email,
      signOutReason,
      ready: scriptLoadedSuccessfully,
      getIdToken,
      refreshIdToken,
      signOut,
      renderSignInButton,
    }),
    [
      status,
      email,
      signOutReason,
      scriptLoadedSuccessfully,
      getIdToken,
      refreshIdToken,
      signOut,
      renderSignInButton,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
