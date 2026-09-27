// リクエストの解釈と action ごとの振り分け（詳細設計 6.1）
import type { Action, ApiResponse, DataOf } from '@chaicoss/shared';
import { isAction } from '@chaicoss/shared';
import { AppError, failure, success } from './errors';

/** 認証済みのリクエストの情報 */
export interface RequestContext {
  /** 操作者のメールアドレス */
  userEmail: string;
}

/** action ごとの処理。payload は未検証の値として受け取り、各処理で入力チェックする */
export type Handlers = {
  [A in Action]?: (payload: unknown, ctx: RequestContext) => DataOf<A>;
};

/** IDトークンを検証し、許可されたメールアドレスを返す。失敗時は AppError（AUTH_*）を投げる */
export type Authenticate = (idToken: unknown) => string;

/**
 * リクエスト本文（JSON 文字列）を処理して応答を返す。
 * 順序：JSON の解釈 → 認証 → action の判定 → 処理。更新系のロック・冪等性は実装順序7で追加する。
 */
export function createRouter(handlers: Handlers, authenticate: Authenticate) {
  return function handle(body: string): ApiResponse<unknown> {
    try {
      let request: unknown;
      try {
        request = JSON.parse(body);
      } catch {
        return failure('VALIDATION_ERROR');
      }
      const { action, idToken, payload } =
        typeof request === 'object' && request !== null
          ? (request as { action?: unknown; idToken?: unknown; payload?: unknown })
          : {};
      const userEmail = authenticate(idToken);
      if (!isAction(action)) return failure('UNKNOWN_ACTION');
      const handler: ((payload: unknown, ctx: RequestContext) => unknown) | undefined =
        handlers[action];
      // 未実装の action も、実装されるまでは不正な操作として扱う
      if (!handler) return failure('UNKNOWN_ACTION');
      return success(handler(payload, { userEmail }));
    } catch (e) {
      if (e instanceof AppError) return failure(e.code, e.details);
      console.error(e);
      return failure('INTERNAL_ERROR');
    }
  };
}
