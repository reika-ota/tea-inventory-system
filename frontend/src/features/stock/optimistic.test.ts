import type { GetAllData, StockHistory } from '@chaicoss/shared';
import { makeBrand, makeLot } from '@chaicoss/shared/testing';
import { describe, expect, it } from 'vitest';
import { applyAdjust, applyConsume, applyDeplete, applyReceive, applyRestore } from './optimistic';

const email = 'taro@example.com';
const data: GetAllData = {
  genres: [],
  colors: [],
  brands: [makeBrand({ brandId: 'b1', servingAmount: 3 })],
  lots: [
    makeLot({ lotId: 'a', bestBefore: '2026-11-01', remainingQty: 10, version: 2 }),
    makeLot({ lotId: 'b', bestBefore: '2027-01-01', remainingQty: 50 }),
    makeLot({ lotId: 'd', remainingQty: 0, isDepleted: true, version: 5 }),
  ],
};
const lot = (d: GetAllData, id: string) => d.lots.find((l) => l.lotId === id);

describe('applyConsume', () => {
  it('引当ルールで選んだロットの残量を減らす', () => {
    const next = applyConsume(data, { brandId: 'b1', servings: 2 }, email);
    expect(lot(next, 'a')).toMatchObject({ remainingQty: 4, version: 3 });
    expect(lot(next, 'b')).toEqual(lot(data, 'b'));
  });

  it('指定ロット・量の指定にも対応する', () => {
    const next = applyConsume(data, { brandId: 'b1', lotId: 'b', amount: 2.5 }, email);
    expect(lot(next, 'b')?.remainingQty).toBe(47.5);
  });

  it('サーバーでエラーになる操作（残量不足）は書き換えない', () => {
    expect(applyConsume(data, { brandId: 'b1', servings: 4 }, email)).toBe(data);
  });
});

describe('applyDeplete', () => {
  it('残量を0にして使い切りにする', () => {
    const next = applyDeplete(data, { lotId: 'a', version: 2 }, email);
    expect(lot(next, 'a')).toMatchObject({ remainingQty: 0, isDepleted: true, version: 3 });
  });

  it('版番号が違う場合は書き換えない', () => {
    expect(applyDeplete(data, { lotId: 'a', version: 1 }, email)).toBe(data);
  });
});

describe('applyRestore', () => {
  const histories: StockHistory[] = [
    {
      historyId: 'h',
      occurredAt: '2026-10-10T10:00:00+09:00',
      userEmail: email,
      lotId: 'd',
      brandId: 'b1',
      delta: -1.5,
      servings: null,
      qtyAfter: 0,
      reason: 'DEPLETE',
      opId: 'op',
    },
  ];

  it('履歴があれば、使い切りで減らした量を戻す', () => {
    const next = applyRestore(data, { lotId: 'd', version: 5 }, histories, email);
    expect(lot(next, 'd')).toMatchObject({ remainingQty: 1.5, isDepleted: false });
  });

  it('履歴を取得していなければ書き換えない', () => {
    expect(applyRestore(data, { lotId: 'd', version: 5 }, undefined, email)).toBe(data);
  });
});

describe('applyReceive', () => {
  it('仮のロットを追加する', () => {
    const next = applyReceive(data, { brandId: 'b1', qty: 50, purchasedOn: '2026-10-12' }, email);
    expect(next.lots).toHaveLength(4);
    expect(next.lots[3]).toMatchObject({ brandId: 'b1', initialQty: 50, remainingQty: 50 });
  });

  it('銘柄がなければ書き換えない', () => {
    const input = { brandId: 'x', qty: 50, purchasedOn: '2026-10-12' };
    expect(applyReceive(data, input, email)).toBe(data);
  });
});

describe('applyAdjust', () => {
  it('残量を書き換える', () => {
    const next = applyAdjust(data, { lotId: 'a', version: 2, remainingQty: 7 }, email);
    expect(lot(next, 'a')).toMatchObject({ remainingQty: 7, version: 3 });
  });

  it('版番号が違う場合は書き換えない', () => {
    expect(applyAdjust(data, { lotId: 'a', version: 1, remainingQty: 7 }, email)).toBe(data);
  });
});
