// 参照系の処理
import type { GetAllData, StockHistory } from '@chaicoss/shared';
import { validateGetHistories } from '@chaicoss/shared';
import { AppError } from '../errors';
import { readBrands, readColors, readGenres, readHistories, readLots } from '../repository';

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

/**
 * 指定銘柄の履歴を新しい順に並べる。
 * 発生日時が同じ場合は、シートの後ろの行（後から記録したもの）を新しいとみなす。
 */
export function newestFirst(histories: readonly StockHistory[], brandId: string): StockHistory[] {
  return histories
    .map((history, index) => ({ history, index }))
    .filter(({ history }) => history.brandId === brandId)
    .sort((a, b) =>
      a.history.occurredAt === b.history.occurredAt
        ? b.index - a.index
        : a.history.occurredAt < b.history.occurredAt
          ? 1
          : -1,
    )
    .map(({ history }) => history);
}

/** 指定銘柄の在庫履歴（新しい順）。銘柄がなければ NOT_FOUND */
export function getHistories(payload: unknown): StockHistory[] {
  const input = validateGetHistories(payload);
  if (!input.ok) throw new AppError('VALIDATION_ERROR', { fieldErrors: input.fieldErrors });
  const { brandId } = input.value;
  if (!readBrands().some((brand) => brand.brandId === brandId)) throw new AppError('NOT_FOUND');
  return newestFirst(readHistories(), brandId);
}
