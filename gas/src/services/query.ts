// 参照系の処理
import type { GetAllData } from '@chaicoss/shared';
import { readBrands, readColors, readGenres, readLots } from '../repository';

/** ジャンル・色・銘柄・ロットを一括取得する（削除済み・使い切りを含む） */
export function getAll(): GetAllData {
  const bySortOrder = (a: { sortOrder: number }, b: { sortOrder: number }) =>
    a.sortOrder - b.sortOrder;
  return {
    genres: readGenres().sort(bySortOrder),
    colors: readColors().sort(bySortOrder),
    brands: readBrands(),
    lots: readLots(),
  };
}
