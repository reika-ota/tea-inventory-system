// 認証・認可（詳細設計 6.2）
import { cacheSeconds, checkTokenInfo, isAllowedEmail, parseAllowedEmails } from './authRules';
import type { TokenInfo } from './authRules';
import { AppError } from './errors';

const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo?id_token=';

/** スクリプトプロパティを読む。未設定は設定漏れなので想定外のエラー（INTERNAL_ERROR）にする */
function requiredProperty(key: 'OAUTH_CLIENT_ID' | 'ALLOWED_EMAILS'): string {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) throw new Error(`スクリプトプロパティ ${key} が設定されていません`);
  return value;
}

/** キャッシュのキー。トークンそのものは保存しないよう、SHA-256 のハッシュにする */
function cacheKey(idToken: string): string {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken);
  return `idt:${Utilities.base64Encode(digest)}`;
}

/** Google の tokeninfo でトークンを検証し、メールアドレスを返す */
function verifyWithGoogle(idToken: string, clientId: string): string {
  const res = UrlFetchApp.fetch(TOKENINFO_URL + encodeURIComponent(idToken), {
    muteHttpExceptions: true,
  });
  // 無効・期限切れのトークンは 400 が返る
  if (res.getResponseCode() !== 200) throw new AppError('AUTH_INVALID_TOKEN');
  const info = JSON.parse(res.getContentText()) as TokenInfo; // Google の応答（各項目は checkTokenInfo で確認する）
  const nowSec = Math.floor(Date.now() / 1000);
  const result = checkTokenInfo(info, clientId, nowSec);
  if (!result) throw new AppError('AUTH_INVALID_TOKEN');

  const seconds = cacheSeconds(result.exp, nowSec);
  if (seconds > 0) {
    CacheService.getScriptCache().put(cacheKey(idToken), result.email, seconds);
  }
  return result.email;
}

/**
 * IDトークンを検証し、許可されたメールアドレスなら返す。
 * 検証済みのトークンはキャッシュし、有効期限まで tokeninfo の呼び出しを省略する。
 * 許可メールアドレスの照合は毎回行う（スクリプトプロパティから外せば、すぐに利用できなくなる）。
 */
export function authenticate(idToken: unknown): string {
  if (typeof idToken !== 'string' || idToken === '') throw new AppError('AUTH_INVALID_TOKEN');
  const clientId = requiredProperty('OAUTH_CLIENT_ID');
  const allowed = parseAllowedEmails(requiredProperty('ALLOWED_EMAILS'));

  const email =
    CacheService.getScriptCache().get(cacheKey(idToken)) ?? verifyWithGoogle(idToken, clientId);
  if (!isAllowedEmail(email, allowed)) throw new AppError('AUTH_FORBIDDEN');
  return email;
}

/** スクリプトプロパティの設定状況を確認する（保守用。メールアドレスそのものはログに出さない） */
export function describeAuthSettings(): string {
  const props = PropertiesService.getScriptProperties();
  const clientId = props.getProperty('OAUTH_CLIENT_ID');
  const allowed = parseAllowedEmails(props.getProperty('ALLOWED_EMAILS') ?? '');
  return [
    `OAUTH_CLIENT_ID：${clientId ? '設定済み' : '未設定'}`,
    `ALLOWED_EMAILS：${allowed.length}件`,
  ].join('、');
}
