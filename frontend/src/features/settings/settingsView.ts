// SC-07 設定の表示内容（UI設計 2.7）を組み立てる純粋関数
import type { Brand, ColorOption, GetAllData, Genre, Lot } from '@chaicoss/shared';
import { isGenreInUse } from '@chaicoss/shared';

/** 使い切ったロットの表示件数（最近のもの） */
export const RECENT_DEPLETED_LIMIT = 10;

export interface GenreRow {
  genre: Genre;
  /** 削除していない銘柄の数 */
  brandCount: number;
  /** 銘柄（削除済みを含む）から参照されている（削除できない） */
  inUse: boolean;
}

export interface SettingsView {
  /** 表示順 */
  genres: GenreRow[];
  /** 削除した銘柄（削除日時の新しい順） */
  deletedBrands: { brand: Brand; genre: Genre | undefined }[];
  /** 使い切ったロット（使い切り日時の新しい順に最大10件。削除した銘柄のロットは除く） */
  depletedLots: { lot: Lot; brand: Brand; genre: Genre | undefined }[];
}

const newestFirst = (a: string | null, b: string | null) => (b ?? '').localeCompare(a ?? '');

export function sortGenres(genres: readonly Genre[]): Genre[] {
  return [...genres].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function buildSettingsView(data: GetAllData): SettingsView {
  const genreOf = (id: string) => data.genres.find((g) => g.genreId === id);
  const liveBrands = data.brands.filter((b) => !b.isDeleted);

  return {
    genres: sortGenres(data.genres).map((genre) => ({
      genre,
      brandCount: liveBrands.filter((b) => b.genreId === genre.genreId).length,
      inUse: isGenreInUse(genre, data.brands),
    })),
    deletedBrands: data.brands
      .filter((b) => b.isDeleted)
      .sort((a, b) => newestFirst(a.deletedAt, b.deletedAt))
      .map((brand) => ({ brand, genre: genreOf(brand.genreId) })),
    depletedLots: data.lots
      .filter((l) => l.isDepleted)
      .sort((a, b) => newestFirst(a.depletedAt, b.depletedAt))
      .flatMap((lot) => {
        const brand = liveBrands.find((b) => b.brandId === lot.brandId);
        return brand ? [{ lot, brand, genre: genreOf(brand.genreId) }] : [];
      })
      .slice(0, RECENT_DEPLETED_LIMIT),
  };
}

/** ジャンルを追加するときの初期の色：まだ使われていない色（色マスタの表示順で最初）。なければ先頭 */
export function defaultGenreColor(
  colors: readonly ColorOption[],
  genres: readonly Genre[],
): string | null {
  const sorted = [...colors].sort((a, b) => a.sortOrder - b.sortOrder);
  const unused = sorted.find((c) => !genres.some((g) => g.color === c.colorCode));
  return (unused ?? sorted[0])?.colorCode ?? null;
}

/** 追加するジャンルの表示順（最後） */
export function nextSortOrder(genres: readonly Genre[]): number {
  return Math.max(0, ...genres.map((g) => g.sortOrder)) + 1;
}

/**
 * ジャンルを上・下へ移動するための表示順の変更。
 * 移動後の並びを 1, 2, 3… と振り直し、表示順が変わるジャンルだけを返す
 * （通常は隣と入れ替える2件。表示順に飛びや重複があっても、他のジャンルとぶつからない）。
 * 移動できない場合は空
 */
export function genreMoves(
  sorted: readonly Genre[],
  index: number,
  direction: 'up' | 'down',
): { genre: Genre; sortOrder: number }[] {
  const other = direction === 'up' ? index - 1 : index + 1;
  const a = sorted[index];
  const b = sorted[other];
  if (!a || !b) return [];
  const moved = [...sorted];
  moved[index] = b;
  moved[other] = a;
  return moved
    .map((genre, i) => ({ genre, sortOrder: i + 1 }))
    .filter((m) => m.genre.sortOrder !== m.sortOrder);
}
