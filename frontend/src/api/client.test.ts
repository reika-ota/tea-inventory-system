import type { ApiResponse } from '@chaicoss/shared';
import { describe, expect, it, vi } from 'vitest';
import { fakeAuth } from '../test/fakeAuth';
import { ApiCallError, createApiClient } from './client';

const url = 'https://example.com/exec';
const data = { genres: [], colors: [], brands: [], lots: [] };

/** 呼ばれるたびに順番に応答を返す fetch */
function fakeFetch(...responses: ApiResponse<unknown>[]) {
  const queue = [...responses];
  return vi.fn((_url: string | URL | Request, _init?: RequestInit) =>
    Promise.resolve(new Response(JSON.stringify(queue.shift()))),
  );
}

/** fetch に渡したリクエスト本文 */
function sentBodies(fetchFn: ReturnType<typeof fakeFetch>) {
  return fetchFn.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as object);
}

const fail = (code: string) => ({ ok: false, error: { code, message: 'm' } }) as ApiResponse<never>;

describe('createApiClient', () => {
  it('text/plain で POST し、ok なら data を返す', async () => {
    const fetchFn = fakeFetch({ ok: true, data });
    const callApi = createApiClient({ url, auth: fakeAuth(), fetchFn });

    await expect(callApi('getAll', {})).resolves.toEqual(data);
    const [calledUrl, init] = fetchFn.mock.calls[0] ?? [];
    expect(calledUrl).toBe(url);
    expect(init?.headers).toEqual({ 'Content-Type': 'text/plain;charset=utf-8' });
    expect(sentBodies(fetchFn)).toEqual([{ action: 'getAll', idToken: 'token-1', payload: {} }]);
  });

  it('更新系は opId を付けて送る（参照系には付けない）', async () => {
    const fetchFn = fakeFetch({ ok: true, data: {} });
    const callApi = createApiClient({ url, auth: fakeAuth(), fetchFn, newOpId: () => 'op-1' });

    await callApi('consume', { brandId: 'b1' });
    expect(sentBodies(fetchFn)[0]).toMatchObject({ action: 'consume', opId: 'op-1' });
  });

  it('トークン期限切れなら取り直して、同じ opId で1回だけ再送する', async () => {
    const fetchFn = fakeFetch(fail('AUTH_INVALID_TOKEN'), { ok: true, data: {} });
    const auth = fakeAuth();
    const callApi = createApiClient({ url, auth, fetchFn, newOpId: () => 'op-1' });

    await callApi('consume', { brandId: 'b1' });
    expect(auth.refreshIdToken).toHaveBeenCalledTimes(1);
    expect(sentBodies(fetchFn)).toMatchObject([
      { idToken: 'token-1', opId: 'op-1' },
      { idToken: 'token-2', opId: 'op-1' },
    ]);
  });

  it('再送しても期限切れなら、ログアウトしてエラーにする（再送は1回まで）', async () => {
    const fetchFn = fakeFetch(fail('AUTH_INVALID_TOKEN'), fail('AUTH_INVALID_TOKEN'));
    const auth = fakeAuth();
    const callApi = createApiClient({ url, auth, fetchFn });

    await expect(callApi('getAll', {})).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(auth.signOut).toHaveBeenCalledWith('expired');
  });

  it('トークンを取り直せなければ、ログアウトしてエラーにする', async () => {
    const fetchFn = fakeFetch(fail('AUTH_INVALID_TOKEN'));
    const auth = fakeAuth({ refreshIdToken: vi.fn(() => Promise.reject(new Error('x'))) });
    const callApi = createApiClient({ url, auth, fetchFn });

    await expect(callApi('getAll', {})).rejects.toMatchObject({ code: 'AUTH_INVALID_TOKEN' });
    expect(auth.signOut).toHaveBeenCalledWith('expired');
  });

  it('トークンを持っていなければ、先に取得してから送る', async () => {
    const fetchFn = fakeFetch({ ok: true, data });
    const auth = fakeAuth({ getIdToken: vi.fn(() => null) });
    const callApi = createApiClient({ url, auth, fetchFn });

    await callApi('getAll', {});
    expect(sentBodies(fetchFn)[0]).toMatchObject({ idToken: 'token-2' });
  });

  it('許可されていないアカウントは、理由付きでログアウトする', async () => {
    const auth = fakeAuth();
    const callApi = createApiClient({ url, auth, fetchFn: fakeFetch(fail('AUTH_FORBIDDEN')) });

    await expect(callApi('getAll', {})).rejects.toBeInstanceOf(ApiCallError);
    expect(auth.signOut).toHaveBeenCalledWith('forbidden');
    expect(auth.refreshIdToken).not.toHaveBeenCalled();
  });

  it('業務エラーはコード・メッセージ・詳細を持つ ApiCallError にする', async () => {
    const fetchFn = fakeFetch({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力内容を確認してください',
        fieldErrors: { a: 'b' },
      },
    });
    const auth = fakeAuth();
    const callApi = createApiClient({ url, auth, fetchFn });

    await expect(callApi('getAll', {})).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '入力内容を確認してください',
      fieldErrors: { a: 'b' },
    });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('通信できなければ NETWORK_ERROR', async () => {
    const fetchFn = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    const callApi = createApiClient({ url, auth: fakeAuth(), fetchFn });

    await expect(callApi('getAll', {})).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
