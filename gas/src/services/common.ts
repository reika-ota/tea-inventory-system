// サービス共通の処理
import type { DomainResult, UpdateContext } from '@chaicoss/shared';
import { toJstDateTime } from '@chaicoss/shared';
import { AppError } from '../errors';
import type { MutationContext } from '../router';

/** 更新の計算に渡す情報（操作者・現在日時・op_id・UUID の採番） */
export function updateContext(ctx: MutationContext): UpdateContext {
  return {
    userEmail: ctx.userEmail,
    now: toJstDateTime(new Date()),
    opId: ctx.opId,
    newId: () => Utilities.getUuid(),
  };
}

/** 計算結果が業務エラーなら AppError にする（最新のデータを current として返す） */
export function unwrap<T>(result: DomainResult<T>): T {
  if (!result.ok) {
    throw new AppError(
      result.code,
      result.current === undefined ? {} : { current: result.current },
    );
  }
  return result.value;
}
