// 楽観的更新（詳細設計 7.3）：サーバーの応答を待たずに、キャッシュ上の在庫を先に書き換える。
// 計算はサーバーと同じ shared の関数を使うため、成功すれば応答と同じ結果になる。
import type {
  AdjustLotPayload,
  ConsumePayload,
  GetAllData,
  Lot,
  LotVersionPayload,
  ReceiveLotPayload,
  StockContext,
  StockHistory,
} from '@chaicoss/shared';
import {
  adjustLot,
  checkLotVersion,
  consumeLot,
  depleteLot,
  planConsume,
  receiveLot,
  restoreLot,
  toJstDateTime,
} from '@chaicoss/shared';

/** 仮の更新情報（履歴 ID などはサーバーの応答で置き換わる） */
function optimisticContext(userEmail: string): StockContext {
  return {
    userEmail,
    now: toJstDateTime(new Date()),
    opId: 'optimistic',
    newId: () => 'optimistic',
  };
}

function replaceLot(data: GetAllData, lot: Lot): GetAllData {
  return { ...data, lots: data.lots.map((l) => (l.lotId === lot.lotId ? lot : l)) };
}

/** 飲んだ。サーバーでエラーになる操作（残量不足など）は書き換えない */
export function applyConsume(
  data: GetAllData,
  input: ConsumePayload,
  userEmail: string,
): GetAllData {
  const brand = data.brands.find((b) => b.brandId === input.brandId);
  const plan = planConsume(brand, data.lots, input);
  if (!plan.ok) return data;
  return replaceLot(data, consumeLot(plan.value, optimisticContext(userEmail)).lot);
}

/** 使い切り */
export function applyDeplete(
  data: GetAllData,
  input: LotVersionPayload,
  userEmail: string,
): GetAllData {
  const checked = checkLotVersion(
    data.lots.find((l) => l.lotId === input.lotId),
    input.version,
  );
  if (!checked.ok) return data;
  const result = depleteLot(checked.value, optimisticContext(userEmail));
  return result.ok ? replaceLot(data, result.value.lot) : data;
}

/**
 * 使い切りの取り消し。戻す量は使い切りの履歴から求めるため、
 * 履歴を取得済みの場合だけ書き換える（未取得ならサーバーの応答を待つ）
 */
export function applyRestore(
  data: GetAllData,
  input: LotVersionPayload,
  histories: readonly StockHistory[] | undefined,
  userEmail: string,
): GetAllData {
  if (!histories) return data;
  const checked = checkLotVersion(
    data.lots.find((l) => l.lotId === input.lotId),
    input.version,
  );
  if (!checked.ok) return data;
  const result = restoreLot(checked.value, histories, optimisticContext(userEmail));
  return result.ok ? replaceLot(data, result.value.lot) : data;
}

/** 購入登録：仮のロットを追加する（ロット ID などはサーバーの応答で置き換わる） */
export function applyReceive(
  data: GetAllData,
  input: ReceiveLotPayload,
  userEmail: string,
): GetAllData {
  const brand = data.brands.find((b) => b.brandId === input.brandId);
  const result = receiveLot(brand, input, optimisticContext(userEmail));
  return result.ok ? { ...data, lots: [...data.lots, result.value.lot] } : data;
}

/** 残量の修正 */
export function applyAdjust(
  data: GetAllData,
  input: AdjustLotPayload,
  userEmail: string,
): GetAllData {
  const checked = checkLotVersion(
    data.lots.find((l) => l.lotId === input.lotId),
    input.version,
  );
  if (!checked.ok) return data;
  const result = adjustLot(checked.value, input.remainingQty, optimisticContext(userEmail));
  return result.ok ? replaceLot(data, result.value.lot) : data;
}
