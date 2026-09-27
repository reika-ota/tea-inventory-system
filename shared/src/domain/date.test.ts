import { describe, expect, it } from 'vitest';
import { daysBetween, isValidIsoDate } from './date';

describe('isValidIsoDate', () => {
  it.each(['2026-09-27', '2028-02-29', '2026-12-31'])('%s は有効', (value) => {
    expect(isValidIsoDate(value)).toBe(true);
  });

  it.each([
    ['実在しない日', '2026-02-30'],
    ['うるう年でない2/29', '2026-02-29'],
    ['13月', '2026-13-01'],
    ['区切りが違う', '2026/09/27'],
    ['ゼロ埋めなし', '2026-9-7'],
    ['時刻付き', '2026-09-27T00:00:00'],
    ['空文字', ''],
    ['文字列以外', 20260927],
  ])('%s は無効', (_label, value) => {
    expect(isValidIsoDate(value)).toBe(false);
  });
});

describe('daysBetween', () => {
  it('後の日付なら正、前なら負の日数', () => {
    expect(daysBetween('2026-09-27', '2026-10-25')).toBe(28);
    expect(daysBetween('2026-09-27', '2026-09-15')).toBe(-12);
    expect(daysBetween('2026-09-27', '2026-09-27')).toBe(0);
  });

  it('年・月をまたいでも正しく数える', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });

  it('不正な日付は例外', () => {
    expect(() => daysBetween('2026-02-30', '2026-03-01')).toThrow();
  });
});
