import { describe, expect, it } from 'vitest';
import { remainingServings, sumQty, validateCreateBrand } from '@chaicoss/shared';
import { SEED_BRANDS, buildSeedData } from './seed';

const now = '2026-09-27T10:00:00+09:00';
let counter = 0;
const newId = () => `id-${++counter}`;
const seed = buildSeedData(now, 'owner@example.com', newId);

describe('buildSeedData', () => {
  it('色11件・ジャンル7件・銘柄14件・ロット14件', () => {
    expect(seed.colors).toHaveLength(11);
    expect(seed.genres).toHaveLength(7);
    expect(seed.brands).toHaveLength(14);
    expect(seed.lots).toHaveLength(14);
  });

  it('ジャンルの色はすべて色マスタにあり、表示順は 1〜7', () => {
    const codes = seed.colors.map((c) => c.colorCode);
    expect(seed.genres.every((g) => codes.includes(g.color))).toBe(true);
    expect(seed.genres.map((g) => g.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('ID はすべて重複しない', () => {
    const ids = [
      ...seed.genres.map((g) => g.genreId),
      ...seed.brands.map((b) => b.brandId),
      ...seed.lots.map((l) => l.lotId),
      ...seed.histories.map((h) => h.historyId),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('銘柄は入力チェックを通る値で、ジャンルは存在するものを参照する', () => {
    const genreIds = seed.genres.map((g) => g.genreId);
    for (const brand of seed.brands) {
      expect(validateCreateBrand(brand).ok).toBe(true);
      expect(genreIds).toContain(brand.genreId);
    }
  });

  it('要件定義 5.1 の値：1杯の量（既定値・ティーバッグ）と残量', () => {
    const byName = (name: string) => seed.brands.find((b) => b.name === name);
    expect(byName('ビスドプランタン')?.servingAmount).toBe(5);
    expect(byName('白牡丹')?.servingAmount).toBe(3); // 既定値
    expect(byName('水仙')?.servingAmount).toBe(8);
    expect(byName('ミントブラックティ')).toMatchObject({ form: 'BAG', servingAmount: 1 });

    const white = byName('白牡丹');
    expect(white && remainingServings(seed.lots, white)).toBe(28); // 86g ÷ 3g
  });

  it('各ロットは購入日 2026-09-26、賞味期限なし、有効', () => {
    for (const lot of seed.lots) {
      expect(lot).toMatchObject({ purchasedOn: '2026-09-26', bestBefore: null, isDepleted: false });
    }
  });

  it('ロットごとの履歴の合計が残量に一致し、1回目は購入（IN）', () => {
    for (const lot of seed.lots) {
      const histories = seed.histories.filter((h) => h.lotId === lot.lotId);
      expect(histories[0]).toMatchObject({ reason: 'IN', delta: lot.initialQty });
      expect(sumQty(histories.map((h) => h.delta))).toBe(lot.remainingQty);
      expect(histories.at(-1)?.qtyAfter).toBe(lot.remainingQty);
    }
  });

  it('履歴はすべて同じ操作ID', () => {
    expect(new Set(seed.histories.map((h) => h.opId)).size).toBe(1);
  });

  it('作成日時・作成者を記録する', () => {
    expect(seed.brands[0]).toMatchObject({
      version: 1,
      createdAt: now,
      createdBy: 'owner@example.com',
      updatedAt: now,
      updatedBy: 'owner@example.com',
    });
  });
});

describe('購入量を指定した場合', () => {
  const base = { name: 'テスト', genre: '紅茶', flavors: [], form: 'LEAF' as const };

  it('購入量でロットを作り、残量との差分を残量修正（ADJUST）として記録する', () => {
    const data = buildSeedData(now, 'owner@example.com', newId, [
      { ...base, qty: 8.5, initialQty: 50 },
    ]);
    expect(data.lots[0]).toMatchObject({ initialQty: 50, remainingQty: 8.5 });
    expect(data.histories.map((h) => [h.reason, h.delta, h.qtyAfter])).toEqual([
      ['IN', 50, 50],
      ['ADJUST', -41.5, 8.5],
    ]);
  });

  it('購入量が残量より少ない場合は例外', () => {
    expect(() =>
      buildSeedData(now, 'owner@example.com', newId, [{ ...base, qty: 10, initialQty: 5 }]),
    ).toThrow('購入量が残量より少なくなっています');
  });

  it('既定の初期データは14銘柄', () => {
    expect(SEED_BRANDS).toHaveLength(14);
  });
});
