import type { GetAllData } from '@chaicoss/shared';

/** 前回の購入量（購入日・作成日時が最も新しいロットの購入量）。初回は null */
export function lastPurchaseQty(data: GetAllData, brandId: string): number | null {
  const lots = data.lots
    .filter((l) => l.brandId === brandId)
    .sort((a, b) =>
      a.purchasedOn === b.purchasedOn
        ? b.createdAt.localeCompare(a.createdAt)
        : b.purchasedOn.localeCompare(a.purchasedOn),
    );
  return lots[0]?.initialQty ?? null;
}
