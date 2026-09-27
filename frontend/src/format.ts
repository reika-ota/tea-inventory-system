// 表示形式（UI設計 1.8・1.9、詳細設計 7.6）
import type { Form, IsoDate, StockHistory, StockReason } from '@chaicoss/shared';
import { daysBetween } from '@chaicoss/shared';

/** 数量：茶葉は `12g`／`12.5g`（小数がある場合のみ1桁）、ティーバッグは `8個` */
export function formatQty(qty: number, form: Form): string {
  if (form === 'BAG') return `${qty}個`;
  return `${Number.isInteger(qty) ? qty : qty.toFixed(1)}g`;
}

/** 増減量：増えた場合は `+` を付ける（例：`+50g`、`-3g`） */
export function formatDelta(delta: number, form: Form): string {
  return `${delta > 0 ? '+' : ''}${formatQty(delta, form)}`;
}

/** 日付：`2026/09/26` */
export function formatDate(date: IsoDate): string {
  return date.replaceAll('-', '/');
}

/** 期限：`期限 2026/10/25（あと28日）`、期限切れは `期限 2026/09/15（12日超過）`、なしは `期限未入力` */
export function formatBestBefore(bestBefore: IsoDate | null, today: IsoDate): string {
  if (bestBefore === null) return '期限未入力';
  const days = daysBetween(today, bestBefore);
  const note = days < 0 ? `${-days}日超過` : `あと${days}日`;
  return `期限 ${formatDate(bestBefore)}（${note}）`;
}

/** 期限（一覧用の短い表示）：`期限 2026/10/25`、なしは `期限未入力` */
export function formatBestBeforeShort(bestBefore: IsoDate | null): string {
  return bestBefore === null ? '期限未入力' : `期限 ${formatDate(bestBefore)}`;
}

export const FORM_LABELS: Readonly<Record<Form, string>> = { LEAF: '茶葉', BAG: 'ティーバッグ' };

const REASON_LABELS: Readonly<Record<StockReason, string>> = {
  IN: '購入',
  CONSUME: '飲んだ',
  ADJUST: '残量修正',
  DEPLETE: '使い切り',
  RESTORE: '使い切り取り消し',
};

/** 履歴の区分：杯数指定の消費は `飲んだ（2杯）` */
export function historyLabel(history: Pick<StockHistory, 'reason' | 'servings'>): string {
  const label = REASON_LABELS[history.reason];
  return history.reason === 'CONSUME' && history.servings !== null
    ? `${label}（${history.servings}杯）`
    : label;
}
