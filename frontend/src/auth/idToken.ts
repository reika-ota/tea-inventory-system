/** IDトークン（JWT）のうち、画面で使う項目 */
export interface IdTokenClaims {
  email: string;
  /** 有効期限（UNIX 秒） */
  exp: number;
}

/**
 * IDトークンの中身（ペイロード）を読む。署名は検証しないため、表示用にだけ使う。
 * トークンが正しいかどうかの判断は GAS 側で行う。
 */
export function decodeIdToken(token: string): IdTokenClaims | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    // base64url → base64 → UTF-8 の文字列
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof claims !== 'object' || claims === null) return null;
    const { email, exp } = claims as { email?: unknown; exp?: unknown };
    return typeof email === 'string' && typeof exp === 'number' ? { email, exp } : null;
  } catch {
    return null;
  }
}
