import { describe, expect, it } from 'vitest';
import { fromTenths, multiplyQty, servingsOf, subtractQty, sumQty, toTenths } from './quantity';

describe('toTenths / fromTenths', () => {
  it('0.1単位の整数に変換し、元に戻せる', () => {
    expect(toTenths(12.5)).toBe(125);
    expect(toTenths(8)).toBe(80);
    expect(fromTenths(125)).toBe(12.5);
  });

  it('浮動小数の誤差を丸める', () => {
    expect(toTenths(0.1 + 0.2)).toBe(3);
  });
});

describe('sumQty / subtractQty / multiplyQty', () => {
  it('小数の誤差なく計算できる', () => {
    expect(0.1 + 0.2).not.toBe(0.3); // 通常の計算では誤差が出る
    expect(sumQty([0.1, 0.2])).toBe(0.3);
    expect(subtractQty(0.3, 0.1)).toBe(0.2);
    expect(multiplyQty(0.1, 3)).toBe(0.3);
  });

  it('空の合計は0', () => {
    expect(sumQty([])).toBe(0);
  });
});

describe('servingsOf', () => {
  it('何杯分かを切り捨てで返す', () => {
    expect(servingsOf(8, 3)).toBe(2);
    expect(servingsOf(9, 3)).toBe(3);
    expect(servingsOf(2.9, 3)).toBe(0);
  });

  it('小数の1杯の量でも誤差なく割り切れる', () => {
    // 0.3 / 0.1 は通常の計算だと 2.9999… になる
    expect(servingsOf(0.3, 0.1)).toBe(3);
  });

  it('1杯の量が0以下なら0', () => {
    expect(servingsOf(10, 0)).toBe(0);
  });
});
