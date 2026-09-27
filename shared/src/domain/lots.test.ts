import { describe, expect, it } from 'vitest';
import { makeBrand, makeLot } from '../test/fixtures';
import {
  activeLotsOf,
  fillRatio,
  maxServingsForLot,
  nearestBestBefore,
  remainingServings,
  selectLotForConsume,
  totalRemainingQty,
} from './lots';

describe('activeLotsOf', () => {
  it('指定銘柄の使い切りでないロットだけを返す', () => {
    const lots = [
      makeLot({ lotId: 'a' }),
      makeLot({ lotId: 'b', isDepleted: true }),
      makeLot({ lotId: 'c', brandId: 'other' }),
    ];
    expect(activeLotsOf(lots, 'b1').map((l) => l.lotId)).toEqual(['a']);
  });
});

describe('selectLotForConsume（引当）', () => {
  it('賞味期限が近いロットを選ぶ', () => {
    const lots = [
      makeLot({ lotId: 'late', bestBefore: '2027-03-01' }),
      makeLot({ lotId: 'early', bestBefore: '2026-12-01' }),
    ];
    expect(selectLotForConsume(lots, 'b1')?.lotId).toBe('early');
  });

  it('賞味期限が未入力のロットは期限ありのロットの後', () => {
    const lots = [
      makeLot({ lotId: 'none', bestBefore: null, purchasedOn: '2026-01-01' }),
      makeLot({ lotId: 'dated', bestBefore: '2030-01-01', purchasedOn: '2026-09-01' }),
    ];
    expect(selectLotForConsume(lots, 'b1')?.lotId).toBe('dated');
  });

  it('賞味期限が同じ（または両方未入力）なら購入日が古いロット', () => {
    const lots = [
      makeLot({ lotId: 'new', purchasedOn: '2026-09-10' }),
      makeLot({ lotId: 'old', purchasedOn: '2026-08-01' }),
    ];
    expect(selectLotForConsume(lots, 'b1')?.lotId).toBe('old');
  });

  it('購入日も同じなら作成日時が古いロット', () => {
    const lots = [
      makeLot({ lotId: 'second', createdAt: '2026-09-01T12:00:00+09:00' }),
      makeLot({ lotId: 'first', createdAt: '2026-09-01T09:00:00+09:00' }),
    ];
    expect(selectLotForConsume(lots, 'b1')?.lotId).toBe('first');
  });

  it('使い切りのロットと他の銘柄のロットは選ばない', () => {
    const lots = [
      makeLot({ lotId: 'depleted', bestBefore: '2026-10-01', isDepleted: true }),
      makeLot({ lotId: 'other', bestBefore: '2026-10-01', brandId: 'b2' }),
      makeLot({ lotId: 'target', bestBefore: '2027-01-01' }),
    ];
    expect(selectLotForConsume(lots, 'b1')?.lotId).toBe('target');
  });

  it('有効ロットがなければ null', () => {
    expect(selectLotForConsume([makeLot({ isDepleted: true })], 'b1')).toBeNull();
    expect(selectLotForConsume([], 'b1')).toBeNull();
  });

  it('引数の配列を並べ替えない', () => {
    const lots = [
      makeLot({ lotId: 'x', bestBefore: '2027-01-01' }),
      makeLot({ lotId: 'y', bestBefore: '2026-01-01' }),
    ];
    selectLotForConsume(lots, 'b1');
    expect(lots.map((l) => l.lotId)).toEqual(['x', 'y']);
  });
});

describe('totalRemainingQty / remainingServings', () => {
  const brand = makeBrand({ servingAmount: 3 });

  it('有効ロットの残量を合計し、1杯の量で割って切り捨てる', () => {
    const lots = [
      makeLot({ lotId: 'a', remainingQty: 5.5 }),
      makeLot({ lotId: 'b', remainingQty: 3.1 }),
      makeLot({ lotId: 'c', remainingQty: 100, isDepleted: true }),
    ];
    expect(totalRemainingQty(lots, brand)).toBe(8.6);
    expect(remainingServings(lots, brand)).toBe(2);
  });

  it('ロットをまたいで合計した量で数える（各ロットが1杯未満でも合計で1杯）', () => {
    const lots = [
      makeLot({ lotId: 'a', remainingQty: 1.5 }),
      makeLot({ lotId: 'b', remainingQty: 1.5 }),
    ];
    expect(remainingServings(lots, brand)).toBe(1);
  });

  it('有効ロットがなければ0', () => {
    expect(totalRemainingQty([], brand)).toBe(0);
    expect(remainingServings([], brand)).toBe(0);
  });

  it('ティーバッグは個数がそのまま杯数', () => {
    const bag = makeBrand({ form: 'BAG', servingAmount: 1 });
    expect(remainingServings([makeLot({ remainingQty: 8 })], bag)).toBe(8);
  });
});

describe('maxServingsForLot', () => {
  it('ロットの残量で飲める杯数（切り捨て）', () => {
    const brand = makeBrand({ servingAmount: 5 });
    expect(maxServingsForLot(makeLot({ remainingQty: 8 }), brand)).toBe(1);
    expect(maxServingsForLot(makeLot({ remainingQty: 4.9 }), brand)).toBe(0);
    expect(maxServingsForLot(makeLot({ remainingQty: 10 }), brand)).toBe(2);
  });
});

describe('fillRatio', () => {
  const brand = makeBrand();

  it('有効ロットの残量合計 ÷ 購入量合計', () => {
    const lots = [
      makeLot({ lotId: 'a', initialQty: 50, remainingQty: 10 }),
      makeLot({ lotId: 'b', initialQty: 50, remainingQty: 20 }),
      makeLot({ lotId: 'c', initialQty: 100, remainingQty: 0, isDepleted: true }),
    ];
    expect(fillRatio(lots, brand)).toBe(0.3);
  });

  it('有効ロットがなければ0', () => {
    expect(fillRatio([], brand)).toBe(0);
  });

  it('残量が購入量を超えても1まで', () => {
    expect(fillRatio([makeLot({ initialQty: 10, remainingQty: 12 })], brand)).toBe(1);
  });
});

describe('nearestBestBefore', () => {
  const brand = makeBrand();

  it('有効ロットのうち最も近い賞味期限（未入力は除く）', () => {
    const lots = [
      makeLot({ lotId: 'a', bestBefore: '2027-01-01' }),
      makeLot({ lotId: 'b', bestBefore: null }),
      makeLot({ lotId: 'c', bestBefore: '2026-11-01' }),
      makeLot({ lotId: 'd', bestBefore: '2026-01-01', isDepleted: true }),
    ];
    expect(nearestBestBefore(lots, brand)).toBe('2026-11-01');
  });

  it('すべて未入力なら null', () => {
    expect(nearestBestBefore([makeLot({ bestBefore: null })], brand)).toBeNull();
  });
});
