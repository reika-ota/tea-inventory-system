// リクエストの解釈と action ごとの振り分け（詳細設計 6.1）
import type {
  Action,
  ApiResponse,
  DataOf,
  MutationAction,
  PayloadOf,
  QueryAction,
  ValidationResult,
} from '@chaicoss/shared';
import { isAction, isMutationAction } from '@chaicoss/shared';
import { AppError, failure, success } from './errors';

/** 認証済みのリクエストの情報 */
export interface RequestContext {
  /** 操作者のメールアドレス */
  userEmail: string;
}

/** 更新系の処理に渡す情報 */
export interface MutationContext extends RequestContext {
  /** 操作ID（履歴に記録する） */
  opId: string;
}

/** 更新系の action の処理 */
export interface MutationHandler<A extends MutationAction> {
  /** 入力チェック（ロックの前に行う）。不正なら AppError（VALIDATION_ERROR）を投げる */
  parse(payload: unknown): PayloadOf<A>;
  /** 業務処理（ロックの内側、op_id の確認の後に呼ばれる）。版の確認・更新・履歴の記録を行う */
  run(input: PayloadOf<A>, ctx: MutationContext): DataOf<A>;
}

/** action ごとの処理。参照系は payload を受け取って各処理で入力チェックする */
export type Handlers = {
  [A in QueryAction]?: (payload: unknown, ctx: RequestContext) => DataOf<A>;
} & {
  [A in MutationAction]?: MutationHandler<A>;
};

/** IDトークンを検証し、許可されたメールアドレスを返す。失敗時は AppError（AUTH_*）を投げる */
export type Authenticate = (idToken: unknown) => string;

/** 更新系をロックの内側で、op_id による重複の確認をしてから処理する */
export type RunMutation = (
  op: { opId: string; action: Action; userEmail: string },
  process: () => unknown,
) => unknown;

/** shared の入力チェックの結果を、エラーなら AppError（VALIDATION_ERROR）に変換する */
export function parseWith<T>(validate: (payload: unknown) => ValidationResult<T>) {
  return (payload: unknown): T => {
    const result = validate(payload);
    if (!result.ok) throw new AppError('VALIDATION_ERROR', { fieldErrors: result.fieldErrors });
    return result.value;
  };
}

/** 振り分けで使う、action の種類に依存しない形 */
interface AnyMutationHandler {
  parse(payload: unknown): unknown;
  run(input: unknown, ctx: MutationContext): unknown;
}

/**
 * リクエスト本文（JSON 文字列）を処理して応答を返す。
 * 更新系の流れ（詳細設計 6.3）：認証 → 入力チェック → ロック取得 → op_id 確認 → 版確認 → 処理
 * → 履歴・操作ログ記録 → ロック解放。ロックと op_id は runMutation、版確認以降は各処理が担う。
 */
export function createRouter(
  handlers: Handlers,
  deps: { authenticate: Authenticate; runMutation: RunMutation },
) {
  return function handle(body: string): ApiResponse<unknown> {
    try {
      let request: unknown;
      try {
        request = JSON.parse(body);
      } catch {
        return failure('VALIDATION_ERROR');
      }
      const { action, idToken, opId, payload } =
        typeof request === 'object' && request !== null
          ? (request as { action?: unknown; idToken?: unknown; opId?: unknown; payload?: unknown })
          : {};
      const userEmail = deps.authenticate(idToken);
      if (!isAction(action)) return failure('UNKNOWN_ACTION');

      if (!isMutationAction(action)) {
        const query: ((payload: unknown, ctx: RequestContext) => unknown) | undefined =
          handlers[action];
        // 未実装の action も、実装されるまでは不正な操作として扱う
        if (!query) return failure('UNKNOWN_ACTION');
        return success(query(payload, { userEmail }));
      }

      // 各 action の handler は payload と data の型が対応しているため、ここでは型を区別しない
      const mutation = handlers[action] as AnyMutationHandler | undefined;
      if (!mutation) return failure('UNKNOWN_ACTION');
      if (typeof opId !== 'string' || opId === '') {
        return failure('VALIDATION_ERROR', { fieldErrors: { opId: '不正な値です' } });
      }
      const input = mutation.parse(payload);
      const data = deps.runMutation({ opId, action, userEmail }, () =>
        mutation.run(input, { userEmail, opId }),
      );
      return success(data);
    } catch (e) {
      if (e instanceof AppError) return failure(e.code, e.details);
      console.error(e);
      return failure('INTERNAL_ERROR');
    }
  };
}
