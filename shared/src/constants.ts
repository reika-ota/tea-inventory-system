import type { Form } from './types';

/** アプリ名 */
export const APP_NAME = 'Chaicoss';

/** 期限間近とみなす日数（当日〜当日＋30日） */
export const NEAR_EXPIRY_DAYS = 30;
/** 残りわずかとみなす残り杯数（この値以下） */
export const LOW_SERVINGS = 3;
/** 1杯の量の既定値（茶葉 3g、ティーバッグ 1個） */
export const DEFAULT_SERVING: Readonly<Record<Form, number>> = { LEAF: 3, BAG: 1 };

/** 入力チェックの上限（詳細設計 4） */
export const LIMITS = {
  genreNameMax: 20,
  brandNameMax: 50,
  flavorMax: 20,
  flavorCountMax: 10,
  shopMax: 50,
  memoMax: 200,
  /** 購入量・残量・消費量の上限（g／個） */
  qtyMax: 9999,
  /** 茶葉の1杯の量の上限（g） */
  leafServingMax: 100,
  servingsMax: 99,
} as const;
