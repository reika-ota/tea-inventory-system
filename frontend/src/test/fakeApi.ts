// テスト用の API（vi.mock('../api/useApi', () => import('../test/fakeApi')) で useApi を差し替える）
import type { Action } from '@chaicoss/shared';
import type { CallApi } from '../api/client';

type Handler = (action: Action, payload: unknown) => unknown;

let handler: Handler = (action) => {
  throw new Error(`テスト用の API が設定されていません: ${action}`);
};

/** action ごとの応答を設定する（例外を投げるとエラー応答になる） */
export function setFakeApi(next: Handler): void {
  handler = next;
}

// テスト用のため応答の型は確認しない
const callApi = ((action: Action, payload: unknown) =>
  Promise.resolve().then(() => handler(action, payload))) as CallApi;

export function useApi(): CallApi {
  return callApi;
}
