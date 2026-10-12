// 在庫の増減（consume・depleteLot・restoreLot）。計算は shared の純粋関数で行い、ここではシートの読み書きをする
import type {
  ConsumePayload,
  LotStockResult,
  LotVersionPayload,
  StockContext,
  StockResult,
} from '@chaicoss/shared';
import {
  checkLotVersion,
  checkQuantity,
  consumeLot,
  depleteLot as depleteLotRule,
  planConsume,
  restoreLot as restoreLotRule,
  toJstDateTime,
} from '@chaicoss/shared';
import { AppError } from '../errors';
import { appendHistories, readBrands, readHistories, readLots, updateLot } from '../repository';
import type { MutationContext } from '../router';

function stockContext(ctx: MutationContext): StockContext {
  return {
    userEmail: ctx.userEmail,
    now: toJstDateTime(new Date()),
    opId: ctx.opId,
    newId: () => Utilities.getUuid(),
  };
}

/** 計算結果が業務エラーなら AppError にする（最新のロットを current として返す） */
function unwrap<T>(result: StockResult<T>): T {
  if (!result.ok) {
    throw new AppError(result.code, result.current ? { current: result.current } : {});
  }
  return result.value;
}

/** ロットの更新と履歴の追加（在庫の増減は必ず履歴に残す） */
function save(result: LotStockResult): LotStockResult {
  updateLot(result.lot);
  appendHistories([result.history]);
  return result;
}

/** 飲んだ（詳細設計 3.4）。差分で処理するため版番号は確認しない */
export function consume(input: ConsumePayload, ctx: MutationContext): LotStockResult {
  const brand = readBrands().find((b) => b.brandId === input.brandId);
  // 入力チェック（ロック前）は茶葉の条件で行っているため、ティーバッグの量はここで確認する
  if (brand?.form === 'BAG' && input.amount !== undefined) {
    const checked = checkQuantity(input.amount, 'BAG');
    if (!checked.ok)
      throw new AppError('VALIDATION_ERROR', { fieldErrors: { amount: checked.error } });
  }
  const plan = unwrap(planConsume(brand, readLots(), input));
  return save(consumeLot(plan, stockContext(ctx)));
}

/** 使い切り */
export function depleteLot(input: LotVersionPayload, ctx: MutationContext): LotStockResult {
  const lot = unwrap(
    checkLotVersion(
      readLots().find((l) => l.lotId === input.lotId),
      input.version,
    ),
  );
  return save(unwrap(depleteLotRule(lot, stockContext(ctx))));
}

/** 使い切りの取り消し */
export function restoreLot(input: LotVersionPayload, ctx: MutationContext): LotStockResult {
  const lot = unwrap(
    checkLotVersion(
      readLots().find((l) => l.lotId === input.lotId),
      input.version,
    ),
  );
  return save(unwrap(restoreLotRule(lot, readHistories(), stockContext(ctx))));
}
