// 項目ごとの入力チェック（詳細設計 4）。
// GAS では JSON から読んだ値（型が不明）をそのまま渡すため、引数は unknown で受け取る。
// フロントエンドは入力欄の文字列を数値に変換してから渡す。
import { LIMITS } from '../constants';
import { isValidIsoDate } from '../domain/date';
import { fromTenths, toTenths } from '../domain/quantity';
import type { Form, IsoDate } from '../types';
import { FORMS } from '../types';

/** 1項目のチェック結果。ok なら正規化した値（前後空白の除去など）を持つ */
export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Checked<T> => ({ ok: true, value });
const ng = (error: string): Checked<never> => ({ ok: false, error });

export const MESSAGES = {
  required: '入力してください',
  invalid: '不正な値です',
  notNumber: '数値で入力してください',
  maxLength: (max: number) => `${max}文字以内で入力してください`,
  sortOrder: '0以上の整数で入力してください',
  color: '色を候補から選んでください',
  form: '形態を選んでください',
  flavorLength: `フレーバーは1〜${LIMITS.flavorMax}文字で入力してください`,
  flavorCount: `フレーバーは${LIMITS.flavorCountMax}個までです`,
  flavorDuplicate: '同じフレーバーが重複しています',
  leafServing: `0.1〜${LIMITS.leafServingMax}の範囲で、小数第1位まで入力してください`,
  bagServing: 'ティーバッグの1杯の量は1個です',
  leafQty: (min: string) => `${min}〜${LIMITS.qtyMax}の範囲で、小数第1位まで入力してください`,
  bagQty: (min: string) => `${min}〜${LIMITS.qtyMax}の整数で入力してください`,
  servings: `1〜${LIMITS.servingsMax}の整数で入力してください`,
  date: '日付を正しく入力してください',
  futureDate: '今日以前の日付を入力してください',
  servingsAndAmount: '杯数と量は同時に指定できません',
} as const;

/** 未入力（undefined・null・空文字）か */
function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** 文字数（サロゲートペアを1文字として数える） */
function charLength(value: string): number {
  return Array.from(value).length;
}

/** 整数か（型の絞り込み付き） */
function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

function isForm(value: unknown): value is Form {
  return FORMS.some((form) => form === value);
}

/** 小数第1位までの数か */
function hasAtMostOneDecimal(value: number): boolean {
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-6;
}

/** ID（UUID）。空でない文字列 */
export function checkId(value: unknown): Checked<string> {
  return typeof value === 'string' && value !== '' ? ok(value) : ng(MESSAGES.invalid);
}

/** 版番号。0以上の整数 */
export function checkVersion(value: unknown): Checked<number> {
  return isInteger(value) && value >= 0 ? ok(value) : ng(MESSAGES.invalid);
}

/** 必須の文字列。前後の空白を除去し、1〜max文字 */
export function checkRequiredText(value: unknown, max: number): Checked<string> {
  if (isBlank(value)) return ng(MESSAGES.required);
  if (typeof value !== 'string') return ng(MESSAGES.invalid);
  const trimmed = value.trim();
  if (trimmed === '') return ng(MESSAGES.required);
  if (charLength(trimmed) > max) return ng(MESSAGES.maxLength(max));
  return ok(trimmed);
}

/** 任意の文字列。前後の空白を除去し、空なら null */
export function checkOptionalText(value: unknown, max: number): Checked<string | null> {
  if (isBlank(value)) return ok(null);
  if (typeof value !== 'string') return ng(MESSAGES.invalid);
  const trimmed = value.trim();
  if (trimmed === '') return ok(null);
  if (charLength(trimmed) > max) return ng(MESSAGES.maxLength(max));
  return ok(trimmed);
}

/** 表示順。0以上の整数 */
export function checkSortOrder(value: unknown): Checked<number> {
  if (isBlank(value)) return ng(MESSAGES.required);
  return isInteger(value) && value >= 0 ? ok(value) : ng(MESSAGES.sortOrder);
}

/** ジャンルの色。色マスタに存在する色コード */
export function checkColor(value: unknown, colorCodes: readonly string[]): Checked<string> {
  if (isBlank(value)) return ng(MESSAGES.color);
  return typeof value === 'string' && colorCodes.includes(value) ? ok(value) : ng(MESSAGES.color);
}

/** 形態。LEAF／BAG */
export function checkForm(value: unknown): Checked<Form> {
  return isForm(value) ? ok(value) : ng(MESSAGES.form);
}

/** フレーバー。各要素1〜20文字（前後空白除去）、最大10個、重複不可。未指定は [] */
export function checkFlavors(value: unknown): Checked<string[]> {
  if (value === undefined || value === null) return ok([]);
  if (!Array.isArray(value)) return ng(MESSAGES.invalid);
  const flavors: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return ng(MESSAGES.invalid);
    const trimmed = item.trim();
    if (trimmed === '' || charLength(trimmed) > LIMITS.flavorMax) return ng(MESSAGES.flavorLength);
    flavors.push(trimmed);
  }
  if (flavors.length > LIMITS.flavorCountMax) return ng(MESSAGES.flavorCount);
  if (new Set(flavors).size !== flavors.length) return ng(MESSAGES.flavorDuplicate);
  return ok(flavors);
}

/**
 * 1杯の量。茶葉は 0.1〜100（小数第1位まで）、ティーバッグは 1 固定（未指定なら 1）。
 * form が不正（null）の場合は形態の項目でエラーになるため、ここではチェックしない。
 */
export function checkServingAmount(value: unknown, form: Form | null): Checked<number> {
  if (form === 'BAG') {
    return isBlank(value) || value === 1 ? ok(1) : ng(MESSAGES.bagServing);
  }
  if (isBlank(value)) return ng(MESSAGES.required);
  if (typeof value !== 'number' || !Number.isFinite(value)) return ng(MESSAGES.notNumber);
  if (form === null) return ok(value);
  const tenths = toTenths(value);
  if (!hasAtMostOneDecimal(value) || tenths < 1 || tenths > LIMITS.leafServingMax * 10) {
    return ng(MESSAGES.leafServing);
  }
  return ok(fromTenths(tenths));
}

/**
 * 購入量・残量・消費量。
 * 茶葉は 0.1〜9999（小数第1位まで）、ティーバッグは 1〜9999 の整数。allowZero（残量）なら下限は 0。
 */
export function checkQuantity(
  value: unknown,
  form: Form,
  options: { allowZero?: boolean } = {},
): Checked<number> {
  if (isBlank(value)) return ng(MESSAGES.required);
  if (typeof value !== 'number' || !Number.isFinite(value)) return ng(MESSAGES.notNumber);
  const tenths = toTenths(value);
  const max = LIMITS.qtyMax * 10;
  if (form === 'LEAF') {
    const min = options.allowZero ? 0 : 1;
    if (!hasAtMostOneDecimal(value) || tenths < min || tenths > max) {
      return ng(MESSAGES.leafQty(options.allowZero ? '0' : '0.1'));
    }
  } else {
    const min = options.allowZero ? 0 : 10;
    if (!Number.isInteger(value) || tenths < min || tenths > max) {
      return ng(MESSAGES.bagQty(options.allowZero ? '0' : '1'));
    }
  }
  return ok(fromTenths(tenths));
}

/** 杯数。1〜99 の整数 */
export function checkServings(value: unknown): Checked<number> {
  if (isBlank(value)) return ng(MESSAGES.required);
  return isInteger(value) && value >= 1 && value <= LIMITS.servingsMax
    ? ok(value)
    : ng(MESSAGES.servings);
}

/** 必須の日付（`YYYY-MM-DD` の実在日付）。notAfter を指定すると、その日より後は不可 */
export function checkRequiredDate(
  value: unknown,
  options: { notAfter?: IsoDate } = {},
): Checked<IsoDate> {
  if (isBlank(value)) return ng(MESSAGES.required);
  if (!isValidIsoDate(value)) return ng(MESSAGES.date);
  // 同じ形式の日付文字列なので、文字列の比較で前後が決まる
  if (options.notAfter !== undefined && value > options.notAfter) return ng(MESSAGES.futureDate);
  return ok(value);
}

/** 任意の日付。未入力なら null */
export function checkOptionalDate(value: unknown): Checked<IsoDate | null> {
  if (isBlank(value)) return ok(null);
  return isValidIsoDate(value) ? ok(value) : ng(MESSAGES.date);
}
