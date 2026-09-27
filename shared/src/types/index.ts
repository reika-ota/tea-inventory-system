// エンティティ型・列挙型（詳細設計 2）
// 数量（initialQty・remainingQty・servingAmount・delta 等）は、茶葉は g（小数第1位まで）、ティーバッグは個（整数）。

export type Uuid = string;
/** 例: 2026-09-26T21:30:00+09:00 */
export type IsoDateTime = string;
/** 例: 2026-09-26 */
export type IsoDate = string;

/** 形態（LEAF＝茶葉、BAG＝ティーバッグ） */
export type Form = 'LEAF' | 'BAG';
export const FORMS: readonly Form[] = ['LEAF', 'BAG'];

/** 在庫履歴の理由区分（購入／消費／残量修正／使い切り／使い切り取り消し） */
export type StockReason = 'IN' | 'CONSUME' | 'ADJUST' | 'DEPLETE' | 'RESTORE';

export interface Audit {
  version: number;
  createdAt: IsoDateTime;
  createdBy: string;
  updatedAt: IsoDateTime;
  updatedBy: string;
}

export interface Genre extends Audit {
  genreId: Uuid;
  name: string;
  /** #rrggbb */
  color: string;
  sortOrder: number;
}

export interface ColorOption {
  /** #rrggbb */
  colorCode: string;
  name: string;
  sortOrder: number;
}

export interface Brand extends Audit {
  brandId: Uuid;
  name: string;
  genreId: Uuid;
  flavors: string[];
  form: Form;
  servingAmount: number;
  shop: string | null;
  memo: string | null;
  isDeleted: boolean;
  deletedAt: IsoDateTime | null;
}

export interface Lot extends Audit {
  lotId: Uuid;
  brandId: Uuid;
  initialQty: number;
  remainingQty: number;
  bestBefore: IsoDate | null;
  purchasedOn: IsoDate;
  isDepleted: boolean;
  depletedAt: IsoDateTime | null;
}

export interface StockHistory {
  historyId: Uuid;
  occurredAt: IsoDateTime;
  userEmail: string;
  lotId: Uuid;
  brandId: Uuid;
  delta: number;
  servings: number | null;
  qtyAfter: number;
  reason: StockReason;
  opId: Uuid;
}
