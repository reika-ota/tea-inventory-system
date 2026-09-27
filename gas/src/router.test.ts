import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from './errors';
import { createRouter } from './router';

const data = { genres: [], colors: [], brands: [], lots: [] };

describe('createRouter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('action に対応する処理の結果を ok: true で返す', () => {
    const getAll = vi.fn(() => data);
    const handle = createRouter({ getAll });
    expect(handle(JSON.stringify({ action: 'getAll', payload: {} }))).toEqual({ ok: true, data });
    expect(getAll).toHaveBeenCalledWith({});
  });

  it('JSON として読めない本文は VALIDATION_ERROR', () => {
    const handle = createRouter({});
    expect(handle('not json')).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
  });

  it.each([
    ['存在しない action', { action: 'dropTable' }],
    ['action なし', {}],
    ['オブジェクトでない', 'getAll'],
    ['未実装の action', { action: 'consume' }],
  ])('%s は UNKNOWN_ACTION', (_label, request) => {
    const handle = createRouter({ getAll: () => data });
    expect(handle(JSON.stringify(request))).toMatchObject({
      ok: false,
      error: { code: 'UNKNOWN_ACTION', message: '不正な操作です' },
    });
  });

  it('AppError はコードと詳細を含むエラー応答にする', () => {
    const handle = createRouter({
      getAll: () => {
        throw new AppError('VALIDATION_ERROR', { fieldErrors: { name: '入力してください' } });
      },
    });
    expect(handle(JSON.stringify({ action: 'getAll' }))).toEqual({
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
    const handle = createRouter({
      getAll: () => {
        throw new Error('シートがありません');
      },
    });
    expect(handle(JSON.stringify({ action: 'getAll' }))).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'エラーが発生しました' },
    });
    expect(log).toHaveBeenCalled();
  });
});
