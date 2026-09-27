// IDトークンの検証ルール（詳細設計 6.2）。GAS に依存しない純粋関数にして、Vitest でテストする。

/** tokeninfo エンドポイントの応答のうち、検証に使う項目（値は文字列で返る） */
export interface TokenInfo {
  iss?: unknown;
  aud?: unknown;
  email?: unknown;
  email_verified?: unknown;
  exp?: unknown;
}

const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/**
 * tokeninfo の応答を検証し、問題なければメールアドレスと有効期限（UNIX 秒）を返す。
 * 検証するのは、発行者が Google、aud が自アプリのクライアントID、メールアドレスが確認済み、有効期限内であること。
 */
export function checkTokenInfo(
  info: TokenInfo,
  clientId: string,
  nowSec: number,
): { email: string; exp: number } | null {
  const { email } = info;
  const exp = Number(info.exp);
  if (typeof email !== 'string' || email === '') return null;
  const valid =
    GOOGLE_ISSUERS.includes(String(info.iss)) &&
    info.aud === clientId &&
    String(info.email_verified) === 'true' &&
    Number.isFinite(exp) &&
    exp > nowSec;
  return valid ? { email, exp } : null;
}

/** スクリプトプロパティ ALLOWED_EMAILS（カンマ区切り）を小文字の配列にする */
export function parseAllowedEmails(csv: string): string[] {
  return csv
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s !== '');
}

/** 許可メールアドレスに含まれるか（大文字・小文字を区別しない） */
export function isAllowedEmail(email: string, allowed: readonly string[]): boolean {
  return allowed.includes(email.trim().toLowerCase());
}

/** 検証結果をキャッシュする秒数。有効期限までとし、CacheService の上限（6時間）を超えない */
export function cacheSeconds(exp: number, nowSec: number): number {
  return Math.min(Math.floor(exp - nowSec), 21600);
}
