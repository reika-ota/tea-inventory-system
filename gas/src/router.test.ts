import { validateLotVersion } from '@chaicoss/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from './errors';
import type { Handlers, RunMutation } from './router';
import { createRouter, parseWith } from './router';

const data = { genres: [], colors: [], brands: [], lots: [] };

/** テスト用の認証：'valid' なら taro@example.com、'other' なら許可外、それ以外は無効 */
const authenticate = (idToken: unknown): string => {
  if (idToken === 'valid') return 'taro@example.com';
  if (idToken === 'other') throw new AppError('AUTH_FORBIDDEN');
  throw new AppError('AUTH_INVALID_TOKEN');
};

/** テスト用の更新処理の実行：ロック・冪等性の代わりに呼び出し順を記録する */
function recordingRunMutation(log: string[]): RunMutation {
  return (op, process) => {
    log.push(`lock+opId:${op.opId}:${op.action}:${op.userEmail}`);
    return process();
  };
}

const router = (handlers: Handlers, log: string[] = []) =>
  createRouter(handlers, { authenticate, runMutation: recordingRunMutation(log) });

const request = (body: object) => JSON.stringify({ idToken: 'valid', payload: {}, ...body });

describe('createRouter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('参照系：action に対応する処理に payload と操作者を渡し、結果を ok: true で返す', () => {
    const getAll = vi.fn(() => data);
    const handle = router({ getAll });
    expect(handle(request({ action: 'getAll' }))).toEqual({ ok: true, data });
    expect(getAll).toHaveBeenCalledWith({}, { userEmail: 'taro@example.com' });
  });

  it('JSON として読めない本文は VALIDATION_ERROR', () => {
    expect(router({})('not json')).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  describe('認証', () => {
    it.each([
      ['トークンが無効', 'expired', 'AUTH_INVALID_TOKEN'],
      ['トークンなし', undefined, 'AUTH_INVALID_TOKEN'],
      ['許可されていないアカウント', 'other', 'AUTH_FORBIDDEN'],
    ])('%s は %s（%s）', (_label, idToken, code) => {
      const getAll = vi.fn(() => data);
      expect(router({ getAll })(JSON.stringify({ action: 'getAll', idToken }))).toMatchObject({
        ok: false,
        error: { code },
      });
      expect(getAll).not.toHaveBeenCalled();
    });

    it('action の判定より先に認証する（未認証なら action の有無を知らせない）', () => {
      expect(router({})(JSON.stringify({ action: 'dropTable', idToken: 'x' }))).toMatchObject({
        error: { code: 'AUTH_INVALID_TOKEN' },
      });
    });
  });

  it.each([
    ['存在しない action', { action: 'dropTable' }],
    ['action なし', {}],
    ['未実装の参照系', { action: 'getHistories' }],
    ['未実装の更新系', { action: 'adjustLot', opId: 'op-1' }],
  ])('%s は UNKNOWN_ACTION', (_label, body) => {
    expect(router({ getAll: () => data })(request(body))).toMatchObject({
      ok: false,
      error: { code: 'UNKNOWN_ACTION', message: '不正な操作です' },
    });
  });

  it('AppError はコードと詳細を含むエラー応答にする', () => {
    const handle = router({
      getAll: () => {
        throw new AppError('VALIDATION_ERROR', { fieldErrors: { name: '入力してください' } });
      },
    });
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
    const handle = router({
      getAll: () => {
        throw new Error('シートがありません');
      },
    });
    expect(handle(request({ action: 'getAll' }))).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'エラーが発生しました' },
    });
    expect(log).toHaveBeenCalled();
  });

  describe('更新系', () => {
    const lotStock = { lot: {}, history: {} } as never;

    it('入力チェック → ロック・op_id 確認 → 処理 の順に行い、処理に操作者と op_id を渡す', () => {
      const log: string[] = [];
      const run = vi.fn(() => {
        log.push('run');
        return lotStock;
      });
      const handle = router(
        {
          depleteLot: {
            parse: (payload) => {
              log.push('parse');
              return parseWith(validateLotVersion)(payload);
            },
            run,
          },
        },
        log,
      );
      const body = request({
        action: 'depleteLot',
        opId: 'op-1',
        payload: { lotId: 'l1', version: 2 },
      });
      expect(handle(body)).toEqual({ ok: true, data: lotStock });
      expect(log).toEqual(['parse', 'lock+opId:op-1:depleteLot:taro@example.com', 'run']);
      expect(run).toHaveBeenCalledWith(
        { lotId: 'l1', version: 2 },
        { userEmail: 'taro@example.com', opId: 'op-1' },
      );
    });

    it('入力エラーはロックを取らずに VALIDATION_ERROR（項目ごとのメッセージ付き）', () => {
      const log: string[] = [];
      const handle = router(
        { depleteLot: { parse: parseWith(validateLotVersion), run: () => lotStock } },
        log,
      );
      expect(
        handle(request({ action: 'depleteLot', opId: 'op-1', payload: { lotId: 'l1' } })),
      ).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION_ERROR', fieldErrors: { version: '不正な値です' } },
      });
      expect(log).toEqual([]);
    });

    it.each([
      ['op_id なし', undefined],
      ['op_id が空', ''],
    ])('%s は VALIDATION_ERROR', (_label, opId) => {
      const handle = router({
        depleteLot: { parse: parseWith(validateLotVersion), run: () => lotStock },
      });
      expect(
        handle(request({ action: 'depleteLot', opId, payload: { lotId: 'l1', version: 1 } })),
      ).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION_ERROR', fieldErrors: { opId: '不正な値です' } },
      });
    });

    it('業務エラー（AppError）は、current を含むエラー応答にする', () => {
      const handle = router({
        depleteLot: {
          parse: parseWith(validateLotVersion),
          run: () => {
            throw new AppError('VERSION_CONFLICT', { current: { lotId: 'l1', version: 3 } });
          },
        },
      });
      expect(
        handle(
          request({ action: 'depleteLot', opId: 'op-1', payload: { lotId: 'l1', version: 2 } }),
        ),
      ).toEqual({
        ok: false,
        error: {
          code: 'VERSION_CONFLICT',
          message: '他の人が更新しました。最新の内容を確認してください',
          current: { lotId: 'l1', version: 3 },
        },
      });
    });
  });
});
