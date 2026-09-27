import { describe, expect, it } from 'vitest';
import { numberFormatsFor, rowsFromValues, valuesFromRows } from './rows';
import { SHEETS } from './schema';

describe('rowsFromValues', () => {
  it('1行目をヘッダーとして、列名で値を引ける行にする', () => {
    const values = [
      ['color_code', 'name', 'sort_order'],
      ['#9a3f1c', '紅茶色', 1],
    ];
    expect(rowsFromValues(values)).toEqual([
      { color_code: '#9a3f1c', name: '紅茶色', sort_order: 1 },
    ]);
  });

  it('列の順番が入れ替わっていても列名で読める', () => {
    const values = [
      ['sort_order', 'color_code'],
      [2, '#7a9a3a'],
    ];
    expect(rowsFromValues(values)[0]).toEqual({ sort_order: 2, color_code: '#7a9a3a' });
  });

  it('空行は読み飛ばす。ヘッダーだけ・空のシートは0件', () => {
    expect(rowsFromValues([['a'], [''], ['x']])).toEqual([{ a: 'x' }]);
    expect(rowsFromValues([['a']])).toEqual([]);
    expect(rowsFromValues([])).toEqual([]);
  });
});

describe('valuesFromRows', () => {
  it('ヘッダーの順番に並べ、値のない列は空にする', () => {
    expect(valuesFromRows(['b', 'a', 'c'], [{ a: 1, b: 2 }])).toEqual([[2, 1, '']]);
  });

  it('シートにない列を書き込もうとすると例外', () => {
    expect(() => valuesFromRows(['a'], [{ a: 1, x: 2 }])).toThrow('シートに列がありません: x');
  });
});

describe('numberFormatsFor', () => {
  it('text 列は書式なしテキスト、それ以外は自動', () => {
    expect(
      numberFormatsFor(['lot_id', 'remaining_qty', 'is_depleted', 'memo'], SHEETS.lots),
    ).toEqual([
      '@',
      'General',
      'General',
      'General', // 定義にない列
    ]);
  });
});

describe('SHEETS', () => {
  it('シートごとに列名の重複がない', () => {
    for (const columns of Object.values(SHEETS)) {
      const names = columns.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('基本設計 4.1 の6シート', () => {
    expect(Object.keys(SHEETS)).toEqual([
      'genres',
      'colors',
      'brands',
      'lots',
      'stock_histories',
      'operations',
    ]);
  });
});
