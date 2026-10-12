import type { GetAllData } from '@chaicoss/shared';
import { makeBrand, makeGenre, makeLot } from '@chaicoss/shared/testing';
import { describe, expect, it } from 'vitest';
import {
  buildSettingsView,
  defaultGenreColor,
  genreMoves,
  nextSortOrder,
  sortGenres,
} from './settingsView';

const g1 = makeGenre({ genreId: 'g1', name: '紅茶', color: '#9a3f1c', sortOrder: 2 });
const g2 = makeGenre({ genreId: 'g2', name: '緑茶', color: '#7a9a3a', sortOrder: 1 });
const g3 = makeGenre({ genreId: 'g3', name: '白茶', color: '#cdb97e', sortOrder: 3 });

describe('buildSettingsView', () => {
  const data: GetAllData = {
    genres: [g1, g2, g3],
    colors: [],
    brands: [
      makeBrand({ brandId: 'a', genreId: 'g1' }),
      makeBrand({ brandId: 'b', genreId: 'g1' }),
      makeBrand({
        brandId: 'old',
        genreId: 'g2',
        isDeleted: true,
        deletedAt: '2026-09-01T10:00:00+09:00',
      }),
      makeBrand({
        brandId: 'new',
        genreId: 'g1',
        isDeleted: true,
        deletedAt: '2026-10-01T10:00:00+09:00',
      }),
    ],
    lots: [
      makeLot({
        lotId: 'l1',
        brandId: 'a',
        isDepleted: true,
        depletedAt: '2026-10-05T10:00:00+09:00',
      }),
      makeLot({
        lotId: 'l2',
        brandId: 'b',
        isDepleted: true,
        depletedAt: '2026-10-09T10:00:00+09:00',
      }),
      makeLot({
        lotId: 'l3',
        brandId: 'old',
        isDepleted: true,
        depletedAt: '2026-10-10T10:00:00+09:00',
      }),
      makeLot({ lotId: 'l4', brandId: 'a' }),
    ],
  };
  const view = buildSettingsView(data);

  it('ジャンルを表示順に、削除していない銘柄の数と、削除できるか（参照の有無）を返す', () => {
    expect(view.genres.map((r) => [r.genre.genreId, r.brandCount, r.inUse])).toEqual([
      ['g2', 0, true], // 削除した銘柄だけが参照している
      ['g1', 2, true],
      ['g3', 0, false],
    ]);
  });

  it('削除した銘柄を削除日時の新しい順に返す', () => {
    expect(view.deletedBrands.map((d) => d.brand.brandId)).toEqual(['new', 'old']);
  });

  it('使い切ったロットを新しい順に返す（削除した銘柄のロットは除く）', () => {
    expect(view.depletedLots.map((d) => d.lot.lotId)).toEqual(['l2', 'l1']);
  });

  it('使い切ったロットは最近10件まで', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeLot({
        lotId: `x${i}`,
        brandId: 'a',
        isDepleted: true,
        depletedAt: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00+09:00`,
      }),
    );
    const v = buildSettingsView({ ...data, lots: many });
    expect(v.depletedLots).toHaveLength(10);
    expect(v.depletedLots[0]?.lot.lotId).toBe('x11');
  });
});

describe('defaultGenreColor', () => {
  const colors = [
    { colorCode: '#9a3f1c', name: '紅茶色', sortOrder: 1 },
    { colorCode: '#7a9a3a', name: '煎茶色', sortOrder: 2 },
    { colorCode: '#4f7f9a', name: '藍色', sortOrder: 3 },
  ];

  it('まだ使われていない色のうち、表示順で最初の色', () => {
    expect(defaultGenreColor(colors, [g1, g2])).toBe('#4f7f9a');
  });

  it('すべて使われていれば先頭、色マスタが空なら null', () => {
    const all = colors.map((c, i) => makeGenre({ genreId: `x${i}`, color: c.colorCode }));
    expect(defaultGenreColor(colors, all)).toBe('#9a3f1c');
    expect(defaultGenreColor([], [])).toBeNull();
  });
});

describe('表示順', () => {
  it('追加するジャンルは最後', () => {
    expect(nextSortOrder([g1, g2, g3])).toBe(4);
    expect(nextSortOrder([])).toBe(1);
  });

  it('上へ・下へ：隣のジャンルと表示順を入れ替える', () => {
    const sorted = sortGenres([g1, g2, g3]); // 緑茶(1) 紅茶(2) 白茶(3)
    expect(genreMoves(sorted, 1, 'up').map((m) => [m.genre.genreId, m.sortOrder])).toEqual([
      ['g1', 1],
      ['g2', 2],
    ]);
    // 移動後の並びの順に返す（白茶が2番目、紅茶が3番目）
    expect(genreMoves(sorted, 1, 'down').map((m) => [m.genre.genreId, m.sortOrder])).toEqual([
      ['g3', 2],
      ['g1', 3],
    ]);
  });

  it('先頭を上へ・最後を下へは移動しない', () => {
    const sorted = sortGenres([g1, g2, g3]);
    expect(genreMoves(sorted, 0, 'up')).toEqual([]);
    expect(genreMoves(sorted, 2, 'down')).toEqual([]);
  });

  it('表示順が同じ値になっていても、振り直して並びを変える', () => {
    const a = makeGenre({ genreId: 'a', sortOrder: 2 });
    const b = makeGenre({ genreId: 'b', sortOrder: 2 });
    expect(genreMoves([a, b], 1, 'up').map((m) => [m.genre.genreId, m.sortOrder])).toEqual([
      ['b', 1],
    ]);
  });

  it('表示順に飛びがあっても、他のジャンルとぶつからない', () => {
    const list = [1, 3, 7, 8].map((sortOrder, i) => makeGenre({ genreId: `n${i}`, sortOrder }));
    const moves = genreMoves(list, 3, 'up');
    const result = list.map((g) => moves.find((m) => m.genre === g)?.sortOrder ?? g.sortOrder);
    expect(new Set(result).size).toBe(4); // 重複なし
    expect(result).toEqual([1, 2, 4, 3]); // n3 が n2 より前
  });
});
