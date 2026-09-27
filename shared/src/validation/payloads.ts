// action ごとの入力チェック。フロントエンド（確定時）と GAS（受信時）で同じ関数を使う。
// 結果が ok なら正規化した payload を返し、ng なら項目名 → メッセージ（fieldErrors）を返す。
import type {
  AdjustLotPayload,
  BrandVersionPayload,
  ConsumePayload,
  CreateBrandPayload,
  CreateGenrePayload,
  DeleteGenrePayload,
  GetHistoriesPayload,
  LotVersionPayload,
  ReceiveLotPayload,
  UpdateBrandPayload,
  UpdateGenrePayload,
  UpdateLotPayload,
} from '../api';
import { LIMITS } from '../constants';
import type { Form, IsoDate } from '../types';
import type { Checked } from './checks';
import {
  MESSAGES,
  checkColor,
  checkFlavors,
  checkForm,
  checkId,
  checkOptionalDate,
  checkOptionalText,
  checkQuantity,
  checkRequiredDate,
  checkRequiredText,
  checkServingAmount,
  checkServings,
  checkSortOrder,
  checkVersion,
} from './checks';

export type ValidationResult<T> =
  { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string> };

type ValuesOf<M> = { [K in keyof M]: M[K] extends Checked<infer T> ? T : never };

/** 項目ごとのチェック結果をまとめる。1つでもエラーがあれば fieldErrors を返す */
function combine<M extends Record<string, Checked<unknown>>>(
  checks: M,
): ValidationResult<ValuesOf<M>> {
  const fieldErrors: Record<string, string> = {};
  const value: Record<string, unknown> = {};
  for (const [key, checked] of Object.entries(checks)) {
    if (checked.ok) value[key] = checked.value;
    else fieldErrors[key] = checked.error;
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  // すべての項目が ok なので、value は ValuesOf<M> の形になっている
  return { ok: true, value: value as ValuesOf<M> };
}

/** JSON から読んだ値をオブジェクトとして扱う（オブジェクトでなければ空として扱い、各項目でエラーにする） */
function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

// ---- ジャンル ----

export function validateCreateGenre(
  input: unknown,
  colorCodes: readonly string[],
): ValidationResult<CreateGenrePayload> {
  const o = asRecord(input);
  return combine({
    name: checkRequiredText(o.name, LIMITS.genreNameMax),
    color: checkColor(o.color, colorCodes),
    sortOrder: checkSortOrder(o.sortOrder),
  });
}

export function validateUpdateGenre(
  input: unknown,
  colorCodes: readonly string[],
): ValidationResult<UpdateGenrePayload> {
  const o = asRecord(input);
  return combine({
    genreId: checkId(o.genreId),
    version: checkVersion(o.version),
    name: checkRequiredText(o.name, LIMITS.genreNameMax),
    color: checkColor(o.color, colorCodes),
    sortOrder: checkSortOrder(o.sortOrder),
  });
}

export function validateDeleteGenre(input: unknown): ValidationResult<DeleteGenrePayload> {
  const o = asRecord(input);
  return combine({ genreId: checkId(o.genreId), version: checkVersion(o.version) });
}

// ---- 銘柄 ----

function brandFieldChecks(o: Record<string, unknown>) {
  const form = checkForm(o.form);
  return {
    name: checkRequiredText(o.name, LIMITS.brandNameMax),
    genreId: checkId(o.genreId),
    flavors: checkFlavors(o.flavors),
    form,
    servingAmount: checkServingAmount(o.servingAmount, form.ok ? form.value : null),
    shop: checkOptionalText(o.shop, LIMITS.shopMax),
    memo: checkOptionalText(o.memo, LIMITS.memoMax),
  };
}

export function validateCreateBrand(input: unknown): ValidationResult<CreateBrandPayload> {
  return combine(brandFieldChecks(asRecord(input)));
}

export function validateUpdateBrand(input: unknown): ValidationResult<UpdateBrandPayload> {
  const o = asRecord(input);
  return combine({
    brandId: checkId(o.brandId),
    version: checkVersion(o.version),
    ...brandFieldChecks(o),
  });
}

/** deleteBrand / restoreBrand */
export function validateBrandVersion(input: unknown): ValidationResult<BrandVersionPayload> {
  const o = asRecord(input);
  return combine({ brandId: checkId(o.brandId), version: checkVersion(o.version) });
}

// ---- 在庫 ----

export function validateGetHistories(input: unknown): ValidationResult<GetHistoriesPayload> {
  return combine({ brandId: checkId(asRecord(input).brandId) });
}

/** form は対象銘柄の形態、today は当日（購入日の上限） */
export function validateReceiveLot(
  input: unknown,
  form: Form,
  today: IsoDate,
): ValidationResult<ReceiveLotPayload> {
  const o = asRecord(input);
  return combine({
    brandId: checkId(o.brandId),
    qty: checkQuantity(o.qty, form),
    bestBefore: checkOptionalDate(o.bestBefore),
    purchasedOn: checkRequiredDate(o.purchasedOn, { notAfter: today }),
  });
}

/**
 * 杯数（servings）と量（amount）はどちらか一方。両方指定は入力エラー、両方省略は servings＝1。
 * form は対象銘柄の形態（量のチェックに使う）
 */
export function validateConsume(input: unknown, form: Form): ValidationResult<ConsumePayload> {
  const o = asRecord(input);
  const hasServings = o.servings !== undefined && o.servings !== null;
  const hasAmount = o.amount !== undefined && o.amount !== null;
  const brandId = checkId(o.brandId);
  const lotId = o.lotId === undefined || o.lotId === null ? undefined : checkId(o.lotId);

  if (hasServings && hasAmount) {
    const result = combine({ brandId, ...(lotId && { lotId }) });
    const fieldErrors = result.ok ? {} : result.fieldErrors;
    return { ok: false, fieldErrors: { ...fieldErrors, amount: MESSAGES.servingsAndAmount } };
  }
  if (hasAmount) {
    return combine({ brandId, ...(lotId && { lotId }), amount: checkQuantity(o.amount, form) });
  }
  return combine({
    brandId,
    ...(lotId && { lotId }),
    servings: hasServings ? checkServings(o.servings) : checkServings(1),
  });
}

/** form は対象ロットの銘柄の形態。残量は0を許容する */
export function validateAdjustLot(input: unknown, form: Form): ValidationResult<AdjustLotPayload> {
  const o = asRecord(input);
  return combine({
    lotId: checkId(o.lotId),
    version: checkVersion(o.version),
    remainingQty: checkQuantity(o.remainingQty, form, { allowZero: true }),
  });
}

/** today は当日（購入日の上限） */
export function validateUpdateLot(
  input: unknown,
  today: IsoDate,
): ValidationResult<UpdateLotPayload> {
  const o = asRecord(input);
  return combine({
    lotId: checkId(o.lotId),
    version: checkVersion(o.version),
    bestBefore: checkOptionalDate(o.bestBefore),
    purchasedOn: checkRequiredDate(o.purchasedOn, { notAfter: today }),
  });
}

/** depleteLot / restoreLot */
export function validateLotVersion(input: unknown): ValidationResult<LotVersionPayload> {
  const o = asRecord(input);
  return combine({ lotId: checkId(o.lotId), version: checkVersion(o.version) });
}
