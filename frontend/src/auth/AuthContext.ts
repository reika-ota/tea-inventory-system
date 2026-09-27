import { createContext, useContext } from 'react';

/** loading＝自動ログインを試行中、signedIn＝ログイン済み、signedOut＝ログイン画面を表示する */
export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

/** ログアウトした理由（ログイン画面の案内に使う） */
export type SignOutReason = 'forbidden' | 'expired' | null;

export interface AuthContextValue {
  status: AuthStatus;
  /** ログイン中のメールアドレス（表示用） */
  email: string | null;
  signOutReason: SignOutReason;
  /** 現在の IDトークン（メモリ上だけに保持する） */
  getIdToken(): string | null;
  /** IDトークンを再取得する（自動ログインで取り直す）。できなければ reject */
  refreshIdToken(): Promise<string>;
  signOut(reason?: SignOutReason): void;
  /**
   * Google 公式のログインボタンを要素の中に表示する（初期化前なら初期化の直後に表示する）。
   * 戻り値の関数で登録を解除する
   */
  renderSignInButton(element: HTMLElement): () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** ログイン状態と操作を取り出すフック（AuthProvider の内側で使う） */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider の内側で使ってください');
  return value;
}
