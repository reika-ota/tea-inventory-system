// シートごとの読み書き。サービスはこの関数だけを使い、SpreadsheetApp を直接呼ばない。
import type { Brand, ColorOption, Genre, Lot, StockHistory } from '@chaicoss/shared';
import type { OperationRecord } from './mapping';
import {
  brandFromRow,
  brandToRow,
  colorFromRow,
  colorToRow,
  genreFromRow,
  genreToRow,
  historyFromRow,
  historyToRow,
  lotFromRow,
  lotToRow,
  operationFromRow,
  operationToRow,
} from './mapping';
import { appendRows, deleteLeadingRows, readRows, updateRow } from './table';

export type { OperationRecord } from './mapping';
export { ensureSheet, hasRows } from './table';

export const readGenres = (): Genre[] => readRows('genres').map(genreFromRow);
export const readColors = (): ColorOption[] => readRows('colors').map(colorFromRow);
export const readBrands = (): Brand[] => readRows('brands').map(brandFromRow);
export const readLots = (): Lot[] => readRows('lots').map(lotFromRow);
export const readHistories = (): StockHistory[] => readRows('stock_histories').map(historyFromRow);
export const readOperations = (): OperationRecord[] => readRows('operations').map(operationFromRow);

export const appendGenres = (genres: readonly Genre[]) =>
  appendRows('genres', genres.map(genreToRow));
export const appendColors = (colors: readonly ColorOption[]) =>
  appendRows('colors', colors.map(colorToRow));
export const appendBrands = (brands: readonly Brand[]) =>
  appendRows('brands', brands.map(brandToRow));
export const appendLots = (lots: readonly Lot[]) => appendRows('lots', lots.map(lotToRow));
export const appendHistories = (histories: readonly StockHistory[]) =>
  appendRows('stock_histories', histories.map(historyToRow));
export const appendOperation = (operation: OperationRecord) =>
  appendRows('operations', [operationToRow(operation)]);

export const updateLot = (lot: Lot) => updateRow('lots', 'lot_id', lotToRow(lot));

/** 処理日時が before より前の操作ログを削除する（古い順に追記しているため先頭から消す） */
export const deleteOperationsBefore = (before: string) =>
  deleteLeadingRows('operations', (row) => operationFromRow(row).processedAt < before);
