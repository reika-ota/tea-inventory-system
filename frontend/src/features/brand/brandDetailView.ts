// SC-03 銘柄詳細の表示内容を組み立てる純粋関数（UI設計 2.3）
import type { AlertKind, Brand, GetAllData, Genre, IsoDate, Lot } from '@chaicoss/shared';
import {
  activeLotsOf,
  alerts,
  compareForConsume,
  fillRatio,
  remainingServings,
  selectLotForConsume,
  totalRemainingQty,
} from '@chaicoss/shared';

export interface LotView {
  lot: Lot;
  /** 引当ルールで次に使うロットか（「次に使う」バッジ） */
  isNext: boolean;
  /** ロットの期限による強調（期限切れ・期限間近。残りわずかは銘柄単位の強調のため付けない） */
  alerts: AlertKind[];
  /** 残量バーの割合（残量 ÷ 購入量、0〜1） */
  ratio: number;
}

export interface BrandDetailView {
  brand: Brand;
  genre: Genre | undefined;
  alerts: AlertKind[];
  totalQty: number;
  servings: number;
  fillRatio: number;
  /** 有効ロット（引当の順） */
  activeLots: LotView[];
  /** 使い切ったロット（使い切りにした日時の新しい順） */
  depletedLots: Lot[];
}

/** 銘柄が見つからなければ null */
export function buildBrandDetailView(
  data: GetAllData,
  brandId: string,
  today: IsoDate,
): BrandDetailView | null {
  const brand = data.brands.find((b) => b.brandId === brandId);
  if (!brand) return null;
  const next = selectLotForConsume(data.lots, brandId);

  const activeLots = activeLotsOf(data.lots, brandId)
    .sort(compareForConsume)
    .map((lot) => ({
      lot,
      isNext: lot.lotId === next?.lotId,
      alerts: alerts([lot], brand, today).filter((kind) => kind !== 'LOW'),
      ratio: lot.initialQty > 0 ? Math.min(lot.remainingQty / lot.initialQty, 1) : 0,
    }));

  const depletedLots = data.lots
    .filter((lot) => lot.brandId === brandId && lot.isDepleted)
    .sort((a, b) => ((a.depletedAt ?? '') < (b.depletedAt ?? '') ? 1 : -1));

  return {
    brand,
    genre: data.genres.find((g) => g.genreId === brand.genreId),
    alerts: alerts(data.lots, brand, today),
    totalQty: totalRemainingQty(data.lots, brand),
    servings: remainingServings(data.lots, brand),
    fillRatio: fillRatio(data.lots, brand),
    activeLots,
    depletedLots,
  };
}
