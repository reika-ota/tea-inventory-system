// シートごとの読み書き。サービスはこの関数だけを使い、SpreadsheetApp を直接呼ばない。
import type { Brand, ColorOption, Genre, Lot, StockHistory } from '@chaicoss/shared';
import {
  brandFromRow,
  brandToRow,
  colorFromRow,
  colorToRow,
  genreFromRow,
  genreToRow,
  historyToRow,
  lotFromRow,
  lotToRow,
} from './mapping';
import { appendRows, readRows } from './table';

export { ensureSheet, hasRows } from './table';

export const readGenres = (): Genre[] => readRows('genres').map(genreFromRow);
export const readColors = (): ColorOption[] => readRows('colors').map(colorFromRow);
export const readBrands = (): Brand[] => readRows('brands').map(brandFromRow);
export const readLots = (): Lot[] => readRows('lots').map(lotFromRow);

export const appendGenres = (genres: readonly Genre[]) =>
  appendRows('genres', genres.map(genreToRow));
export const appendColors = (colors: readonly ColorOption[]) =>
  appendRows('colors', colors.map(colorToRow));
export const appendBrands = (brands: readonly Brand[]) =>
  appendRows('brands', brands.map(brandToRow));
export const appendLots = (lots: readonly Lot[]) => appendRows('lots', lots.map(lotToRow));
export const appendHistories = (histories: readonly StockHistory[]) =>
  appendRows('stock_histories', histories.map(historyToRow));
