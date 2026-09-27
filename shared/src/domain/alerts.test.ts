import { describe, expect, it } from 'vitest';
import { makeBrand, makeLot } from '../test/fixtures';
import { alertLevel, alerts } from './alerts';

const today = '2026-09-27';
const brand = makeBrand({ servingAmount: 3 });
/** 残りわずかにならない十分な残量 */
const plenty = 100;

describe('alerts', () => {
  it('期限切れ：賞味期限 ＜ 当日', () => {
    const lots = [makeLot({ bestBefore: '2026-09-26', remainingQty: plenty })];
    expect(alerts(lots, brand, today)).toEqual(['EXPIRED']);
  });

  it.each([
    ['当日', '2026-09-27'],
    ['当日＋30日', '2026-10-27'],
  ])('期限間近：%s は対象', (_label, bestBefore) => {
    const lots = [makeLot({ bestBefore, remainingQty: plenty })];
    expect(alerts(lots, brand, today)).toEqual(['NEAR_EXPIRY']);
  });

  it('当日＋31日は期限間近ではない', () => {
    const lots = [makeLot({ bestBefore: '2026-10-28', remainingQty: plenty })];
    expect(alerts(lots, brand, today)).toEqual([]);
  });

  it('賞味期限が未入力のロットは期限による強調の対象外', () => {
    const lots = [makeLot({ bestBefore: null, remainingQty: plenty })];
    expect(alerts(lots, brand, today)).toEqual([]);
  });

  it('残りわずか：残り杯数が3杯以下', () => {
    expect(alerts([makeLot({ remainingQty: 11.9 })], brand, today)).toEqual(['LOW']); // 3杯
    expect(alerts([makeLot({ remainingQty: 12 })], brand, today)).toEqual([]); // 4杯
  });

  it('残りわずかは銘柄の有効ロットの合計で判定する', () => {
    const lots = [
      makeLot({ lotId: 'a', remainingQty: 6 }),
      makeLot({ lotId: 'b', remainingQty: 6 }),
    ];
    expect(alerts(lots, brand, today)).toEqual([]);
  });

  it('複数に該当する場合は、期限切れ→期限間近→残りわずかの順にすべて返す', () => {
    const lots = [
      makeLot({ lotId: 'a', bestBefore: '2026-10-01', remainingQty: 3 }),
      makeLot({ lotId: 'b', bestBefore: '2026-09-01', remainingQty: 3 }),
    ];
    expect(alerts(lots, brand, today)).toEqual(['EXPIRED', 'NEAR_EXPIRY', 'LOW']);
  });

  it('使い切りのロットと他の銘柄のロットは判定に含めない', () => {
    const lots = [
      makeLot({ lotId: 'a', bestBefore: '2027-01-01', remainingQty: plenty }),
      makeLot({ lotId: 'b', bestBefore: '2026-09-01', isDepleted: true }),
      makeLot({ lotId: 'c', bestBefore: '2026-09-01', brandId: 'b2' }),
    ];
    expect(alerts(lots, brand, today)).toEqual([]);
  });

  it('有効ロットがない銘柄は強調しない（残り0杯でも残りわずかにしない）', () => {
    expect(alerts([], brand, today)).toEqual([]);
    expect(alerts([makeLot({ isDepleted: true, remainingQty: 0 })], brand, today)).toEqual([]);
  });

  it('ロット単位の判定は、そのロットだけを渡す', () => {
    const expired = makeLot({ lotId: 'a', bestBefore: '2026-09-01', remainingQty: plenty });
    const low = makeLot({ lotId: 'b', bestBefore: '2027-09-01', remainingQty: 6 });
    expect(alerts([expired, low], brand, today)).toEqual(['EXPIRED']);
    expect(alerts([low], brand, today)).toEqual(['LOW']);
  });
});

describe('alertLevel', () => {
  it('最も強い強調を返す', () => {
    const lots = [
      makeLot({ lotId: 'a', bestBefore: '2026-10-01', remainingQty: 3 }),
      makeLot({ lotId: 'b', bestBefore: '2026-09-01', remainingQty: 3 }),
    ];
    expect(alertLevel(lots, brand, today)).toBe('EXPIRED');
    expect(alertLevel([makeLot({ bestBefore: '2026-10-01', remainingQty: 3 })], brand, today)).toBe(
      'NEAR_EXPIRY',
    );
    expect(alertLevel([makeLot({ remainingQty: 3 })], brand, today)).toBe('LOW');
  });

  it('該当なしは NONE', () => {
    expect(alertLevel([makeLot({ remainingQty: plenty })], brand, today)).toBe('NONE');
  });
});
