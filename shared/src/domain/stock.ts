// 在庫を増減する操作の計算（詳細設計 3.3・3.4）。
// GAS（実際の更新）とフロントエンド（楽観的更新）の両方で使うため、純粋関数にする。
import type { ConsumePayload, ErrorCode, LotStockResult } from '../api';
import type { Brand, IsoDateTime, Lot, StockHistory, StockReason } from '../types';
import { selectLotForConsume } from './lots';
import { fromTenths, multiplyQty, subtractQty, toTenths } from './quantity';

/** 更新に使う情報（操作者・日時・操作ID・ID の採番） */
export interface StockContext {
  userEmail: string;
  now: IsoDateTime;
  opId: string;
  newId: () => string;
}

/** 計算の結果。業務エラーの場合はエラーコードと、利用者に返す最新のロット */
export type StockResult<T> = { ok: true; value: T } | { ok: false; code: ErrorCode; current?: Lot };

const fail = (code: ErrorCode, current?: Lot): StockResult<never> => ({
  ok: false,
  code,
  ...(current && { current }),
});

/** 減らした量を履歴の増減量（負の数）にする（0 は 0 のまま） */
function negate(qty: number): number {
  return qty === 0 ? 0 : fromTenths(-toTenths(qty));
}

/** ロットを更新し、版番号を1つ上げる */
function touch(lot: Lot, changes: Partial<Lot>, ctx: StockContext): Lot {
  return {
    ...lot,
    ...changes,
    version: lot.version + 1,
    updatedAt: ctx.now,
    updatedBy: ctx.userEmail,
  };
}

function history(
  lot: Lot,
  delta: number,
  reason: StockReason,
  servings: number | null,
  ctx: StockContext,
): StockHistory {
  return {
    historyId: ctx.newId(),
    occurredAt: ctx.now,
    userEmail: ctx.userEmail,
    lotId: lot.lotId,
    brandId: lot.brandId,
    delta,
    servings,
    qtyAfter: lot.remainingQty,
    reason,
    opId: ctx.opId,
  };
}

// ---- 消費（consume） ----

export interface ConsumePlan {
  lot: Lot;
  /** 減らす量 */
  amount: number;
  /** 杯数で指定した場合の杯数（量で指定した場合は null） */
  servings: number | null;
}

/**
 * 消費するロットと量を決める（詳細設計 3.4 の 2〜5）。
 * input は入力チェック済み（servings と amount はどちらか一方）であること。
 */
export function planConsume(
  brand: Brand | undefined,
  lots: readonly Lot[],
  input: ConsumePayload,
): StockResult<ConsumePlan> {
  if (!brand || brand.isDeleted) return fail('NOT_FOUND');

  let lot: Lot | null;
  if (input.lotId !== undefined) {
    lot = lots.find((l) => l.lotId === input.lotId && l.brandId === brand.brandId) ?? null;
    if (!lot) return fail('NOT_FOUND');
    if (lot.isDepleted) return fail('LOT_DEPLETED', lot);
  } else {
    lot = selectLotForConsume(lots, brand.brandId);
    if (!lot) return fail('NO_ACTIVE_LOT');
  }

  // 杯数指定時の量は、最新の銘柄マスタの1杯の量から計算する
  const servings = input.amount === undefined ? (input.servings ?? 1) : null;
  const amount =
    servings === null ? (input.amount ?? 0) : multiplyQty(brand.servingAmount, servings);
  if (toTenths(amount) > toTenths(lot.remainingQty)) return fail('INSUFFICIENT_STOCK', lot);
  return { ok: true, value: { lot, amount, servings } };
}

/** 消費を反映する。残量0になっても使い切りにはしない（フロントエンドが確認してから depleteLot を呼ぶ） */
export function consumeLot(plan: ConsumePlan, ctx: StockContext): LotStockResult {
  const lot = touch(
    plan.lot,
    { remainingQty: subtractQty(plan.lot.remainingQty, plan.amount) },
    ctx,
  );
  return { lot, history: history(lot, negate(plan.amount), 'CONSUME', plan.servings, ctx) };
}

// ---- 使い切り（depleteLot）・使い切りの取り消し（restoreLot） ----

/** ロットの存在と版番号を確認する（楽観ロック） */
export function checkLotVersion(lot: Lot | undefined, version: number): StockResult<Lot> {
  if (!lot) return fail('NOT_FOUND');
  if (lot.version !== version) return fail('VERSION_CONFLICT', lot);
  return { ok: true, value: lot };
}

/** 使い切り：残量を0にし、減らした量を DEPLETE として記録する */
export function depleteLot(lot: Lot, ctx: StockContext): StockResult<LotStockResult> {
  if (lot.isDepleted) return fail('LOT_DEPLETED', lot);
  const updated = touch(lot, { remainingQty: 0, isDepleted: true, depletedAt: ctx.now }, ctx);
  return {
    ok: true,
    value: {
      lot: updated,
      history: history(updated, negate(lot.remainingQty), 'DEPLETE', null, ctx),
    },
  };
}

/**
 * 使い切りの取り消し：最新の DEPLETE 履歴で減らした量を残量に戻し、RESTORE として記録する。
 * histories はこのロットの履歴を含むこと（他のロットの履歴が混ざっていてもよい）
 */
export function restoreLot(
  lot: Lot,
  histories: readonly StockHistory[],
  ctx: StockContext,
): StockResult<LotStockResult> {
  if (!lot.isDepleted) return fail('LOT_NOT_DEPLETED', lot);
  const depletes = histories.filter((h) => h.lotId === lot.lotId && h.reason === 'DEPLETE');
  // 後に記録したものほど新しい（同じ日時なら配列の後ろを優先する）
  const latest = depletes.reduce<StockHistory | undefined>(
    (acc, h) => (!acc || h.occurredAt >= acc.occurredAt ? h : acc),
    undefined,
  );
  const restored = latest ? negate(latest.delta) : 0;
  const updated = touch(lot, { remainingQty: restored, isDepleted: false, depletedAt: null }, ctx);
  return {
    ok: true,
    value: { lot: updated, history: history(updated, restored, 'RESTORE', null, ctx) },
  };
}
