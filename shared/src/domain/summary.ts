// ジャンル別集計（UI設計 2.6）
import type { Brand, Genre, Lot } from '../types';
import { activeLotsOf } from './lots';
import { sumQty } from './quantity';

export interface GenreSummary {
  genre: Genre;
  /** 有効ロットを持つ銘柄の数 */
  brandCount: number;
  /** 茶葉の残量合計（g） */
  leafQty: number;
  /** ティーバッグの残量合計（個） */
  bagQty: number;
}

/** 全ジャンルを表示順に並べ、ジャンルごとの銘柄数と形態別の残量合計を返す */
export function summarizeByGenre(
  genres: readonly Genre[],
  brands: readonly Brand[],
  lots: readonly Lot[],
): GenreSummary[] {
  return [...genres]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((genre) => {
      let brandCount = 0;
      const leaf: number[] = [];
      const bag: number[] = [];
      for (const brand of brands) {
        if (brand.genreId !== genre.genreId || brand.isDeleted) continue;
        const active = activeLotsOf(lots, brand.brandId);
        if (active.length === 0) continue;
        brandCount += 1;
        const target = brand.form === 'LEAF' ? leaf : bag;
        target.push(...active.map((lot) => lot.remainingQty));
      }
      return { genre, brandCount, leafQty: sumQty(leaf), bagQty: sumQty(bag) };
    });
}
