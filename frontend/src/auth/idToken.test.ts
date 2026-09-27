import { describe, expect, it } from 'vitest';
import { decodeIdToken } from './idToken';

/** テスト用の JWT（署名は検証しないため適当な値） */
function jwt(payload: object): string {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const base64url = btoa(String.fromCharCode(...json))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${base64url}.signature`;
}

describe('decodeIdToken', () => {
  it('メールアドレスと有効期限を読む', () => {
    expect(decodeIdToken(jwt({ email: 'taro@example.com', exp: 1800000000 }))).toEqual({
      email: 'taro@example.com',
      exp: 1800000000,
    });
  });

  it('日本語（UTF-8）を含むペイロードも読める', () => {
    const token = jwt({ email: 'taro@example.com', exp: 1, name: '太郎？' });
    expect(decodeIdToken(token)?.email).toBe('taro@example.com');
  });

  it.each([
    ['区切りがない', 'abc'],
    ['base64 でない', 'a.@@@.c'],
    ['JSON でない', `a.${btoa('not json')}.c`],
    ['メールアドレスがない', jwt({ exp: 1 })],
  ])('%s場合は null', (_label, token) => {
    expect(decodeIdToken(token)).toBeNull();
  });
});
