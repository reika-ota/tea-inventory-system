// ロットの引当・残り杯数（詳細設計 5、基本設計 5.1・5.3）
import type { Brand, IsoDate, Lot, Uuid } from '../types';
import { servingsOf, sumQty, toTenths } from './quantity';

/** 指定銘柄の有効ロット（使い切りでないロット） */
export function activeLotsOf(lots: readonly Lot[], brandId: Uuid): Lot[] {
  return lots.filter((lot) => lot.brandId === brandId && !lot.isDepleted);
}

/**
 * 引当の並び順：賞味期限の昇順（未入力は最後）→ 購入日の昇順 → 作成日時の昇順。
 * 日付・日時は同じ形式の文字列なので、文字列の比較で順序が決まる。
 */
export function compareForConsume(a: Lot, b: Lot): number {
  if (a.bestBefore !== b.bestBefore) {
    if (a.bestBefore === null) return 1;
    if (b.bestBefore === null) return -1;
    return a.bestBefore < b.bestBefore ? -1 : 1;
  }
  if (a.purchasedOn !== b.purchasedOn) {
    return a.purchasedOn < b.purchasedOn ? -1 : 1;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? -1 : 1;
  }
  return 0;
}

/** 引当ルールで消費対象のロットを1つ選ぶ。有効ロットがなければ null */
export function selectLotForConsume(lots: readonly Lot[], brandId: Uuid): Lot | null {
  const sorted = activeLotsOf(lots, brandId).sort(compareForConsume);
  return sorted[0] ?? null;
}

/** 有効ロットの残量合計 */
export function totalRemainingQty(lots: readonly Lot[], brand: Brand): number {
  return sumQty(activeLotsOf(lots, brand.brandId).map((lot) => lot.remainingQty));
}

/** 残り杯数 ＝ floor（有効ロットの残量合計 ÷ 1杯の量） */
export function remainingServings(lots: readonly Lot[], brand: Brand): number {
  return servingsOf(totalRemainingQty(lots, brand), brand.servingAmount);
}

/**
 * お茶の色の丸（TeaCup）の塗りの割合 ＝ 有効ロットの残量合計 ÷ 購入量合計（0〜1）。
 * 有効ロットがなければ0
 */
export function fillRatio(lots: readonly Lot[], brand: Brand): number {
  const active = activeLotsOf(lots, brand.brandId);
  const initial = toTenths(sumQty(active.map((lot) => lot.initialQty)));
  if (initial <= 0) return 0;
  return Math.min(toTenths(totalRemainingQty(active, brand)) / initial, 1);
}

/** 有効ロットのうち最も近い賞味期限。すべて未入力（または有効ロットなし）なら null */
export function nearestBestBefore(lots: readonly Lot[], brand: Brand): IsoDate | null {
  const dates = activeLotsOf(lots, brand.brandId).flatMap((lot) =>
    lot.bestBefore === null ? [] : [lot.bestBefore],
  );
  return dates.sort()[0] ?? null;
}

/** ロットで飲める杯数 ＝ floor（ロット残量 ÷ 1杯の量）。杯数選択の上限 */
export function maxServingsForLot(lot: Lot, brand: Brand): number {
  return servingsOf(lot.remainingQty, brand.servingAmount);
}
