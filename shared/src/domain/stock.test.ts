import { describe, expect, it } from 'vitest';
import { makeBrand, makeLot } from '../test/fixtures';
import type { StockHistory } from '../types';
import type { StockContext } from './stock';
import { checkLotVersion, consumeLot, depleteLot, planConsume, restoreLot } from './stock';

const ctx: StockContext = {
  userEmail: 'hanako@example.com',
  now: '2026-10-12T09:00:00+09:00',
  opId: 'op-1',
  newId: () => 'h-new',
};

const brand = makeBrand({ brandId: 'b1', servingAmount: 3 });
const sooner = makeLot({ lotId: 'sooner', bestBefore: '2026-11-01', remainingQty: 10, version: 4 });
const later = makeLot({ lotId: 'later', bestBefore: '2027-01-01', remainingQty: 50 });
const lots = [later, sooner];

describe('planConsume', () => {
  it('ロット指定なしは引当ルールで選び、杯数 × 1杯の量を減らす', () => {
    expect(planConsume(brand, lots, { brandId: 'b1', servings: 2 })).toEqual({
      ok: true,
      value: { lot: sooner, amount: 6, servings: 2 },
    });
  });

  it('杯数・量とも省略すると1杯', () => {
    const plan = planConsume(brand, lots, { brandId: 'b1' });
    expect(plan.ok && plan.value).toMatchObject({ amount: 3, servings: 1 });
  });

  it('ロットを指定できる。量で指定した場合の杯数は null', () => {
    const plan = planConsume(brand, lots, { brandId: 'b1', lotId: 'later', amount: 2.5 });
    expect(plan).toEqual({ ok: true, value: { lot: later, amount: 2.5, servings: null } });
  });

  it('1杯の量が小数でも誤差なく計算する', () => {
    const leaf = makeBrand({ servingAmount: 0.1 });
    const plan = planConsume(leaf, [sooner], { brandId: 'b1', servings: 3 });
    expect(plan.ok && plan.value.amount).toBe(0.3);
  });

  it('残量ちょうどは消費できる', () => {
    const plan = planConsume(brand, [sooner], { brandId: 'b1', amount: 10 });
    expect(plan.ok).toBe(true);
  });

  it.each([
    ['銘柄がない', undefined, lots, { brandId: 'b1' }, 'NOT_FOUND'],
    ['削除済みの銘柄', makeBrand({ isDeleted: true }), lots, { brandId: 'b1' }, 'NOT_FOUND'],
    [
      '有効ロットがない',
      brand,
      [makeLot({ isDepleted: true })],
      { brandId: 'b1' },
      'NO_ACTIVE_LOT',
    ],
    ['指定ロットがない', brand, lots, { brandId: 'b1', lotId: 'x' }, 'NOT_FOUND'],
    [
      '指定ロットが他の銘柄',
      brand,
      [makeLot({ lotId: 'other', brandId: 'b2' })],
      { brandId: 'b1', lotId: 'other' },
      'NOT_FOUND',
    ],
    [
      '指定ロットが使い切り',
      brand,
      [makeLot({ lotId: 'd', isDepleted: true })],
      { brandId: 'b1', lotId: 'd' },
      'LOT_DEPLETED',
    ],
  ] as const)('%s は %s', (_label, b, ls, input, code) => {
    expect(planConsume(b, ls, input)).toMatchObject({ ok: false, code });
  });

  it('残量が足りなければ INSUFFICIENT_STOCK（対象ロットを返す）', () => {
    expect(planConsume(brand, lots, { brandId: 'b1', servings: 4 })).toEqual({
      ok: false,
      code: 'INSUFFICIENT_STOCK',
      current: sooner,
    });
  });
});

describe('consumeLot', () => {
  it('残量を減らして版番号を上げ、CONSUME 履歴（杯数付き）を作る', () => {
    const result = consumeLot({ lot: sooner, amount: 6, servings: 2 }, ctx);
    expect(result.lot).toMatchObject({
      remainingQty: 4,
      version: 5,
      updatedAt: ctx.now,
      updatedBy: ctx.userEmail,
      isDepleted: false,
    });
    expect(result.history).toEqual({
      historyId: 'h-new',
      occurredAt: ctx.now,
      userEmail: ctx.userEmail,
      lotId: 'sooner',
      brandId: 'b1',
      delta: -6,
      servings: 2,
      qtyAfter: 4,
      reason: 'CONSUME',
      opId: 'op-1',
    });
  });

  it('残量が0になっても使い切りにしない。小数も誤差なく計算する', () => {
    const lot = makeLot({ remainingQty: 0.3 });
    const result = consumeLot({ lot, amount: 0.3, servings: null }, ctx);
    expect(result.lot).toMatchObject({ remainingQty: 0, isDepleted: false });
    expect(result.history).toMatchObject({ delta: -0.3, servings: null });
  });
});

describe('checkLotVersion', () => {
  it('版番号が一致すればロットを返す', () => {
    expect(checkLotVersion(sooner, 4)).toEqual({ ok: true, value: sooner });
  });

  it('一致しなければ VERSION_CONFLICT（最新のロットを返す）、なければ NOT_FOUND', () => {
    expect(checkLotVersion(sooner, 3)).toEqual({
      ok: false,
      code: 'VERSION_CONFLICT',
      current: sooner,
    });
    expect(checkLotVersion(undefined, 1)).toEqual({ ok: false, code: 'NOT_FOUND' });
  });
});

describe('depleteLot', () => {
  it('残量を0にし、減らした量を DEPLETE として記録する', () => {
    const result = depleteLot(sooner, ctx);
    expect(result.ok && result.value.lot).toMatchObject({
      remainingQty: 0,
      isDepleted: true,
      depletedAt: ctx.now,
      version: 5,
    });
    expect(result.ok && result.value.history).toMatchObject({
      delta: -10,
      qtyAfter: 0,
      reason: 'DEPLETE',
      servings: null,
    });
  });

  it('残量0のロットも使い切りにでき、増減量は0', () => {
    const result = depleteLot(makeLot({ remainingQty: 0 }), ctx);
    expect(result.ok && result.value.history.delta).toBe(0);
  });

  it('使い切り済みは LOT_DEPLETED', () => {
    expect(depleteLot(makeLot({ isDepleted: true }), ctx)).toMatchObject({
      ok: false,
      code: 'LOT_DEPLETED',
    });
  });
});

describe('restoreLot', () => {
  const depleted = makeLot({
    lotId: 'l1',
    remainingQty: 0,
    isDepleted: true,
    depletedAt: '2026-10-11T08:00:00+09:00',
    version: 7,
  });
  const h = (delta: number, occurredAt: string, lotId = 'l1'): StockHistory => ({
    historyId: `${lotId}-${occurredAt}`,
    occurredAt,
    userEmail: 'taro@example.com',
    lotId,
    brandId: 'b1',
    delta,
    servings: null,
    qtyAfter: 0,
    reason: 'DEPLETE',
    opId: 'x',
  });

  it('最新の DEPLETE 履歴で減らした量を戻し、RESTORE として記録する', () => {
    const histories = [
      h(-5, '2026-10-01T08:00:00+09:00'),
      h(-2.5, '2026-10-11T08:00:00+09:00'),
      h(-99, '2026-10-12T08:00:00+09:00', 'other-lot'),
    ];
    const result = restoreLot(depleted, histories, ctx);
    expect(result.ok && result.value.lot).toMatchObject({
      remainingQty: 2.5,
      isDepleted: false,
      depletedAt: null,
      version: 8,
    });
    expect(result.ok && result.value.history).toMatchObject({
      delta: 2.5,
      qtyAfter: 2.5,
      reason: 'RESTORE',
    });
  });

  it('DEPLETE 履歴がなければ残量0で戻す', () => {
    const result = restoreLot(depleted, [], ctx);
    expect(result.ok && result.value.lot.remainingQty).toBe(0);
  });

  it('使い切りでなければ LOT_NOT_DEPLETED', () => {
    expect(restoreLot(sooner, [], ctx)).toMatchObject({ ok: false, code: 'LOT_NOT_DEPLETED' });
  });
});
