// シートの2次元配列と行（列名 → 値）の相互変換。GAS に依存しない純粋関数。
import type { ColumnDef, Row } from './schema';

/** getValues() の結果（1行目＝ヘッダー）を行の配列にする */
export function rowsFromValues(values: readonly (readonly unknown[])[]): Row[] {
  const [header, ...body] = values;
  if (!header) return [];
  const names = header.map(String);
  return body
    .filter((cells) => cells.some((cell) => cell !== '' && cell !== null))
    .map((cells) => Object.fromEntries(names.map((name, i) => [name, cells[i]])));
}

/**
 * 行の配列をヘッダーの順番に並べた2次元配列にする。
 * ヘッダーにない列を書き込もうとした場合は、シートの列が足りないため例外にする。
 */
export function valuesFromRows(header: readonly string[], rows: readonly Row[]): unknown[][] {
  return rows.map((row) => {
    for (const key of Object.keys(row)) {
      if (!header.includes(key)) {
        throw new Error(`シートに列がありません: ${key}（setupSheets を実行してください）`);
      }
    }
    return header.map((name) => row[name] ?? '');
  });
}

/** ヘッダーの順番に並べた表示形式（text 列は書式なしテキスト '@'） */
export function numberFormatsFor(
  header: readonly string[],
  columns: readonly ColumnDef[],
): string[] {
  return header.map((name) =>
    columns.find((c) => c.name === name)?.type === 'text' ? '@' : 'General',
  );
}
