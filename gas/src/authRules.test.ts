import { describe, expect, it } from 'vitest';
import { cacheSeconds, checkTokenInfo, isAllowedEmail, parseAllowedEmails } from './authRules';

const clientId = 'client-123.apps.googleusercontent.com';
const now = 1_800_000_000;
const valid = {
  iss: 'https://accounts.google.com',
  aud: clientId,
  email: 'taro@example.com',
  email_verified: 'true',
  exp: String(now + 3600),
};

describe('checkTokenInfo', () => {
  it('条件をすべて満たせばメールアドレスと有効期限を返す', () => {
    expect(checkTokenInfo(valid, clientId, now)).toEqual({
      email: 'taro@example.com',
      exp: now + 3600,
    });
  });

  it('発行者は accounts.google.com も可', () => {
    expect(checkTokenInfo({ ...valid, iss: 'accounts.google.com' }, clientId, now)).not.toBeNull();
  });

  it('email_verified が真偽値でも読める', () => {
    expect(checkTokenInfo({ ...valid, email_verified: true }, clientId, now)).not.toBeNull();
  });

  it.each([
    ['別アプリ向けのトークン（aud 不一致）', { aud: 'other-app' }],
    ['発行者が Google でない', { iss: 'https://evil.example.com' }],
    ['メールアドレスが未確認', { email_verified: 'false' }],
    ['メールアドレスなし', { email: undefined }],
    ['有効期限切れ', { exp: String(now) }],
    ['有効期限が数値でない', { exp: 'abc' }],
  ])('%s は無効', (_label, override) => {
    expect(checkTokenInfo({ ...valid, ...override }, clientId, now)).toBeNull();
  });
});

describe('許可メールアドレス', () => {
  it('カンマ区切りを分割し、空白と空要素を除いて小文字にする', () => {
    expect(parseAllowedEmails(' Taro@Example.com, hanako@example.com ,,')).toEqual([
      'taro@example.com',
      'hanako@example.com',
    ]);
    expect(parseAllowedEmails('')).toEqual([]);
  });

  it('大文字・小文字を区別せずに照合する', () => {
    const allowed = parseAllowedEmails('taro@example.com');
    expect(isAllowedEmail('TARO@example.com', allowed)).toBe(true);
    expect(isAllowedEmail('jiro@example.com', allowed)).toBe(false);
  });
});

describe('cacheSeconds', () => {
  it('有効期限までの秒数。上限は6時間', () => {
    expect(cacheSeconds(now + 3600, now)).toBe(3600);
    expect(cacheSeconds(now + 99999, now)).toBe(21600);
    expect(cacheSeconds(now - 1, now)).toBeLessThanOrEqual(0);
  });
});
