// シートの読み書き（SpreadsheetApp を使うのはこのファイルだけ）。詳細設計 6.5
import { numberFormatsFor, rowsFromValues, valuesFromRows } from './rows';
import type { Row, SheetName } from './schema';
import { SHEETS } from './schema';

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

function spreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  return SpreadsheetApp.getActiveSpreadsheet();
}

export function getSheet(name: SheetName): Sheet {
  const sheet = spreadsheet().getSheetByName(name);
  if (!sheet) throw new Error(`シートがありません: ${name}（setupSheets を実行してください）`);
  return sheet;
}

function headerOf(sheet: Sheet): string[] {
  if (sheet.getLastColumn() === 0) return [];
  const [first] = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues();
  return (first ?? []).map(String);
}

/** 全行を読み込む（データ量が小さいため、毎回全件取得する） */
export function readRows(name: SheetName): Row[] {
  return rowsFromValues(getSheet(name).getDataRange().getValues());
}

/** データ行（ヘッダー以外）があるか */
export function hasRows(name: SheetName): boolean {
  return getSheet(name).getLastRow() > 1;
}

/** 末尾に行を追加する。text 列は書式なしテキストにしてから書き込み、自動変換を防ぐ */
export function appendRows(name: SheetName, rows: readonly Row[]): void {
  if (rows.length === 0) return;
  const sheet = getSheet(name);
  const header = headerOf(sheet);
  const values = valuesFromRows(header, rows);
  const formats = numberFormatsFor(header, SHEETS[name]);
  const range = sheet.getRange(sheet.getLastRow() + 1, 1, values.length, header.length);
  range.setNumberFormats(values.map(() => formats));
  range.setValues(values);
}

/**
 * シートを作成し、ヘッダーと列の書式を設定する。
 * 既にあるシートのデータは変更せず、足りない列だけを右端に追加する。
 */
export function ensureSheet(name: SheetName): void {
  const ss = spreadsheet();
  const sheet = ss.getSheetByName(name) ?? ss.insertSheet(name);
  const columns = SHEETS[name];
  const header = headerOf(sheet);
  const missing = columns.filter((c) => !header.includes(c.name)).map((c) => c.name);
  if (missing.length > 0) {
    sheet.getRange(1, header.length + 1, 1, missing.length).setValues([missing]);
  }
  sheet.setFrozenRows(1);
  const fullHeader = [...header, ...missing];
  sheet.getRange(1, 1, 1, fullHeader.length).setFontWeight('bold');
  // 2行目以降の列全体の表示形式（text 列は書式なしテキスト）
  const rowsBelowHeader = sheet.getMaxRows() - 1;
  if (rowsBelowHeader > 0) {
    const formats = numberFormatsFor(fullHeader, columns);
    sheet
      .getRange(2, 1, rowsBelowHeader, fullHeader.length)
      .setNumberFormats(Array.from({ length: rowsBelowHeader }, () => formats));
  }
}
