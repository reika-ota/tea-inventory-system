// ロットの更新（consume・depleteLot・restoreLot・receiveLot・adjustLot・updateLot）。計算は shared の純粋関数で行い、ここではシートの読み書きをする
import type {
  AdjustLotPayload,
  ConsumePayload,
  Lot,
  LotStockResult,
  LotVersionPayload,
  ReceiveLotPayload,
  StockContext,
  StockHistory,
  StockResult,
  UpdateLotPayload,
} from '@chaicoss/shared';
import {
  adjustLot as adjustLotRule,
  checkLotVersion,
  checkQuantity,
  consumeLot,
  depleteLot as depleteLotRule,
  planConsume,
  receiveLot as receiveLotRule,
  restoreLot as restoreLotRule,
  toJstDateTime,
  updateLotDates,
} from '@chaicoss/shared';
import { AppError } from '../errors';
import {
  appendHistories,
  appendLots,
  readBrands,
  readHistories,
  readLots,
  updateLot as updateLotRow,
} from '../repository';
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
  updateLotRow(result.lot);
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

/** ティーバッグの数量（整数）を確認する（ロック前は茶葉の条件で確認しているため） */
function checkBagQuantity(field: string, value: number, options: { allowZero?: boolean } = {}) {
  const checked = checkQuantity(value, 'BAG', options);
  if (!checked.ok)
    throw new AppError('VALIDATION_ERROR', { fieldErrors: { [field]: checked.error } });
}

/** 購入登録：ロットを作り、購入量を IN として記録する */
export function receiveLot(input: ReceiveLotPayload, ctx: MutationContext): Lot {
  const brand = readBrands().find((b) => b.brandId === input.brandId);
  if (brand?.form === 'BAG') checkBagQuantity('qty', input.qty);
  const result = unwrap(receiveLotRule(brand, input, stockContext(ctx)));
  appendLots([result.lot]);
  appendHistories([result.history]);
  return result.lot;
}

/** 残量の修正：差分を ADJUST として記録する（変更がなければ記録しない） */
export function adjustLot(
  input: AdjustLotPayload,
  ctx: MutationContext,
): { lot: Lot; history: StockHistory | null } {
  const lots = readLots();
  const lot = unwrap(
    checkLotVersion(
      lots.find((l) => l.lotId === input.lotId),
      input.version,
    ),
  );
  const brand = readBrands().find((b) => b.brandId === lot.brandId);
  if (brand?.form === 'BAG')
    checkBagQuantity('remainingQty', input.remainingQty, { allowZero: true });
  const result = unwrap(adjustLotRule(lot, input.remainingQty, stockContext(ctx)));
  if (result.history) save({ lot: result.lot, history: result.history });
  return result;
}

/** 賞味期限・購入日の修正（在庫は増減しないため履歴は記録しない） */
export function updateLot(input: UpdateLotPayload, ctx: MutationContext): Lot {
  const lot = unwrap(
    checkLotVersion(
      readLots().find((l) => l.lotId === input.lotId),
      input.version,
    ),
  );
  const updated = updateLotDates(lot, input, stockContext(ctx));
  updateLotRow(updated);
  return updated;
}
