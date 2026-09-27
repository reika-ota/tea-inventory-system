// API の共通型（詳細設計 3.1）
import type { Uuid } from '../types';
import type { Action, DataOf, PayloadOf } from './actions';
import type { ErrorCode } from './errors';

export * from './actions';
export * from './errors';

export interface ApiRequest<A extends Action = Action> {
  action: A;
  idToken: string;
  /** 更新系は必須 */
  opId?: Uuid;
  payload: PayloadOf<A>;
}

export interface ApiError {
  code: ErrorCode;
  /** 利用者向け日本語メッセージ */
  message: string;
  /** VALIDATION_ERROR 時：項目名 → メッセージ */
  fieldErrors?: Record<string, string>;
  /** VERSION_CONFLICT・INSUFFICIENT_STOCK 時の最新データ */
  current?: unknown;
}

/** GAS は常に HTTP 200 を返すため、成否は ok で判定する */
export type ApiResponse<D> = { ok: true; data: D } | { ok: false; error: ApiError };

export type ApiResponseOf<A extends Action> = ApiResponse<DataOf<A>>;
