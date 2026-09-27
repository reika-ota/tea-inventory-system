import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from './errors';
import { createRouter } from './router';

const data = { genres: [], colors: [], brands: [], lots: [] };

/** テスト用の認証：'valid' なら taro@example.com、'other' なら許可外、それ以外は無効 */
const authenticate = (idToken: unknown): string => {
  if (idToken === 'valid') return 'taro@example.com';
  if (idToken === 'other') throw new AppError('AUTH_FORBIDDEN');
  throw new AppError('AUTH_INVALID_TOKEN');
};

const request = (body: object) => JSON.stringify({ idToken: 'valid', payload: {}, ...body });

describe('createRouter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('action に対応する処理に payload と操作者を渡し、結果を ok: true で返す', () => {
    const getAll = vi.fn(() => data);
    const handle = createRouter({ getAll }, authenticate);
    expect(handle(request({ action: 'getAll' }))).toEqual({ ok: true, data });
    expect(getAll).toHaveBeenCalledWith({}, { userEmail: 'taro@example.com' });
  });

  it('JSON として読めない本文は VALIDATION_ERROR', () => {
    const handle = createRouter({}, authenticate);
    expect(handle('not json')).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
  });

  describe('認証', () => {
    it.each([
      ['トークンが無効', 'expired', 'AUTH_INVALID_TOKEN'],
      ['トークンなし', undefined, 'AUTH_INVALID_TOKEN'],
      ['許可されていないアカウント', 'other', 'AUTH_FORBIDDEN'],
    ])('%s は %s（%s）', (_label, idToken, code) => {
      const getAll = vi.fn(() => data);
      const handle = createRouter({ getAll }, authenticate);
      expect(handle(JSON.stringify({ action: 'getAll', idToken }))).toMatchObject({
        ok: false,
        error: { code },
      });
      expect(getAll).not.toHaveBeenCalled();
    });

    it('action の判定より先に認証する（未認証なら action の有無を知らせない）', () => {
      const handle = createRouter({}, authenticate);
      expect(handle(JSON.stringify({ action: 'dropTable', idToken: 'x' }))).toMatchObject({
        error: { code: 'AUTH_INVALID_TOKEN' },
      });
    });
  });

  it.each([
    ['存在しない action', { action: 'dropTable' }],
    ['action なし', {}],
    ['未実装の action', { action: 'consume' }],
  ])('%s は UNKNOWN_ACTION', (_label, body) => {
    const handle = createRouter({ getAll: () => data }, authenticate);
    expect(handle(request(body))).toMatchObject({
      ok: false,
      error: { code: 'UNKNOWN_ACTION', message: '不正な操作です' },
    });
  });

  it('オブジェクトでない本文は、トークンがないため AUTH_INVALID_TOKEN', () => {
    const handle = createRouter({ getAll: () => data }, authenticate);
    expect(handle(JSON.stringify('getAll'))).toMatchObject({
      error: { code: 'AUTH_INVALID_TOKEN' },
    });
  });

  it('AppError はコードと詳細を含むエラー応答にする', () => {
    const handle = createRouter(
      {
        getAll: () => {
          throw new AppError('VALIDATION_ERROR', { fieldErrors: { name: '入力してください' } });
        },
      },
      authenticate,
    );
    expect(handle(request({ action: 'getAll' }))).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力内容を確認してください',
        fieldErrors: { name: '入力してください' },
      },
    });
  });

  it('想定外の例外は INTERNAL_ERROR にし、詳細はログに出す', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handle = createRouter(
      {
        getAll: () => {
          throw new Error('シートがありません');
        },
      },
      authenticate,
    );
    expect(handle(request({ action: 'getAll' }))).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'エラーが発生しました' },
    });
    expect(log).toHaveBeenCalled();
  });
});
