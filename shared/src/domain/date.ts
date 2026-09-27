// 日付（YYYY-MM-DD）の計算。タイムゾーンの影響を受けないよう UTC の暦日として扱う。
import type { IsoDate } from '../types';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 暦日を UTC の時刻値にする。形式が不正または実在しない日付なら null */
function toUtcMs(date: string): number | null {
  const m = ISO_DATE.exec(date);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  // 2026-02-30 のように繰り上がった場合は実在しない日付
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
    return null;
  }
  return ms;
}

/** `YYYY-MM-DD` 形式の実在する日付か */
export function isValidIsoDate(value: unknown): value is IsoDate {
  return typeof value === 'string' && toUtcMs(value) !== null;
}

/** from から to までの日数（to が後なら正）。どちらかが不正な日付なら例外 */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const a = toUtcMs(from);
  const b = toUtcMs(to);
  if (a === null || b === null) {
    throw new Error(`不正な日付です: ${from}, ${to}`);
  }
  return Math.round((b - a) / DAY_MS);
}
