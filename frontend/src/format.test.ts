import { describe, expect, it } from 'vitest';
import {
  formatBestBefore,
  formatBestBeforeShort,
  formatDate,
  formatDelta,
  formatQty,
  historyLabel,
} from './format';

describe('formatQty', () => {
  it('茶葉は小数がある場合のみ1桁、ティーバッグは個', () => {
    expect(formatQty(12, 'LEAF')).toBe('12g');
    expect(formatQty(12.5, 'LEAF')).toBe('12.5g');
    expect(formatQty(0, 'LEAF')).toBe('0g');
    expect(formatQty(8, 'BAG')).toBe('8個');
  });
});

describe('formatDelta', () => {
  it('増えた場合だけ + を付ける', () => {
    expect(formatDelta(50, 'LEAF')).toBe('+50g');
    expect(formatDelta(-3.5, 'LEAF')).toBe('-3.5g');
    expect(formatDelta(-1, 'BAG')).toBe('-1個');
  });
});

describe('日付・期限', () => {
  const today = '2026-09-27';

  it('日付は YYYY/MM/DD', () => {
    expect(formatDate('2026-09-26')).toBe('2026/09/26');
  });

  it('期限までの日数・超過日数を付ける', () => {
    expect(formatBestBefore('2026-10-25', today)).toBe('期限 2026/10/25（あと28日）');
    expect(formatBestBefore('2026-09-27', today)).toBe('期限 2026/09/27（あと0日）');
    expect(formatBestBefore('2026-09-15', today)).toBe('期限 2026/09/15（12日超過）');
    expect(formatBestBefore(null, today)).toBe('期限未入力');
  });

  it('一覧用の短い表示', () => {
    expect(formatBestBeforeShort('2026-10-25')).toBe('期限 2026/10/25');
    expect(formatBestBeforeShort(null)).toBe('期限未入力');
  });
});

describe('historyLabel', () => {
  it('区分名。杯数指定の消費は杯数を付ける', () => {
    expect(historyLabel({ reason: 'IN', servings: null })).toBe('購入');
    expect(historyLabel({ reason: 'CONSUME', servings: 2 })).toBe('飲んだ（2杯）');
    expect(historyLabel({ reason: 'CONSUME', servings: null })).toBe('飲んだ');
    expect(historyLabel({ reason: 'ADJUST', servings: null })).toBe('残量修正');
    expect(historyLabel({ reason: 'DEPLETE', servings: null })).toBe('使い切り');
    expect(historyLabel({ reason: 'RESTORE', servings: null })).toBe('使い切り取り消し');
  });
});
