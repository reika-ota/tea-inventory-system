// 強調表示の判定（基本設計 3.4、UI設計 1.7）
import { LOW_SERVINGS, NEAR_EXPIRY_DAYS } from '../constants';
import type { Brand, IsoDate, Lot } from '../types';
import { daysBetween } from './date';
import { activeLotsOf, remainingServings } from './lots';

/** 強調の種別（期限切れ／期限間近／残りわずか） */
export type AlertKind = 'EXPIRED' | 'NEAR_EXPIRY' | 'LOW';
export type AlertLevel = AlertKind | 'NONE';

/**
 * 該当する強調をすべて返す（並び順：期限切れ→期限間近→残りわずか）。
 * - lots のうち、brand の有効ロットだけを対象にする
 * - 有効ロットがない銘柄は強調しない（在庫なし枠で扱うため）
 * - 賞味期限が未入力のロットは期限による強調の対象外
 * - ロット単位で判定する場合は alerts([lot], brand, today) とする
 */
export function alerts(lots: readonly Lot[], brand: Brand, today: IsoDate): AlertKind[] {
  const active = activeLotsOf(lots, brand.brandId);
  if (active.length === 0) return [];

  const daysLeft = active.flatMap((lot) =>
    lot.bestBefore === null ? [] : [daysBetween(today, lot.bestBefore)],
  );

  const result: AlertKind[] = [];
  if (daysLeft.some((d) => d < 0)) result.push('EXPIRED');
  if (daysLeft.some((d) => d >= 0 && d <= NEAR_EXPIRY_DAYS)) result.push('NEAR_EXPIRY');
  if (remainingServings(active, brand) <= LOW_SERVINGS) result.push('LOW');
  return result;
}

/** 最も強い強調（EXPIRED＞NEAR_EXPIRY＞LOW）。なければ 'NONE' */
export function alertLevel(lots: readonly Lot[], brand: Brand, today: IsoDate): AlertLevel {
  return alerts(lots, brand, today)[0] ?? 'NONE';
}
