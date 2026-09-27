// 数量の単位変換。
// 茶葉は小数第1位まで扱うため、計算は 0.1 単位の整数（×10）で行い、小数の誤差を避ける。
// ティーバッグ（整数）も同じ関数で扱えるよう、形態によらず ×10 で統一する。

/** g／個 → 0.1単位の整数 */
export function toTenths(qty: number): number {
  return Math.round(qty * 10);
}

/** 0.1単位の整数 → g／個 */
export function fromTenths(tenths: number): number {
  return tenths / 10;
}

/** 数量の合計（誤差なし） */
export function sumQty(quantities: readonly number[]): number {
  return fromTenths(quantities.reduce((acc, q) => acc + toTenths(q), 0));
}

/** 数量の差（a − b、誤差なし） */
export function subtractQty(a: number, b: number): number {
  return fromTenths(toTenths(a) - toTenths(b));
}

/** 1杯の量 × 杯数（誤差なし） */
export function multiplyQty(servingAmount: number, servings: number): number {
  return fromTenths(toTenths(servingAmount) * servings);
}

/** 数量が何杯分か（切り捨て）。1杯の量が0以下なら0 */
export function servingsOf(qty: number, servingAmount: number): number {
  const serving = toTenths(servingAmount);
  if (serving <= 0) return 0;
  return Math.max(0, Math.floor(toTenths(qty) / serving));
}
