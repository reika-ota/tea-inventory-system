// 銘柄マスタの更新の計算（詳細設計 3.3）。GAS の更新処理で使う純粋関数
import type { CreateBrandPayload, UpdateBrandPayload } from '../api';
import type { Brand, Genre, Lot } from '../types';
import { activeLotsOf } from './lots';
import type { DomainResult as Result, UpdateContext } from './result';
import { fail } from './result';

const genreExists = (genres: readonly Genre[], genreId: string) =>
  genres.some((g) => g.genreId === genreId);

/** 入力チェック済みの項目を銘柄の項目にする（任意項目の省略は null） */
function brandFields(input: CreateBrandPayload) {
  return {
    name: input.name,
    genreId: input.genreId,
    flavors: input.flavors,
    form: input.form,
    servingAmount: input.servingAmount,
    shop: input.shop ?? null,
    memo: input.memo ?? null,
  };
}

/** 銘柄の存在と版番号を確認する（楽観ロック） */
export function checkBrandVersion(brand: Brand | undefined, version: number): Result<Brand> {
  if (!brand) return fail('NOT_FOUND');
  if (brand.version !== version) return fail('VERSION_CONFLICT', brand);
  return { ok: true, value: brand };
}

/** 銘柄の登録。ジャンルがなければ NOT_FOUND */
export function createBrand(
  genres: readonly Genre[],
  input: CreateBrandPayload,
  ctx: UpdateContext,
): Result<Brand> {
  if (!genreExists(genres, input.genreId)) return fail('NOT_FOUND');
  return {
    ok: true,
    value: {
      brandId: ctx.newId(),
      ...brandFields(input),
      isDeleted: false,
      deletedAt: null,
      version: 1,
      createdAt: ctx.now,
      createdBy: ctx.userEmail,
      updatedAt: ctx.now,
      updatedBy: ctx.userEmail,
    },
  };
}

function touch(brand: Brand, changes: Partial<Brand>, ctx: UpdateContext): Brand {
  return {
    ...brand,
    ...changes,
    version: brand.version + 1,
    updatedAt: ctx.now,
    updatedBy: ctx.userEmail,
  };
}

/**
 * 銘柄の編集。ジャンルがなければ NOT_FOUND。
 * 有効ロットがある場合は形態を変えられない（残量の単位が変わるため）：BRAND_HAS_ACTIVE_LOTS
 */
export function updateBrand(
  brand: Brand,
  genres: readonly Genre[],
  lots: readonly Lot[],
  input: UpdateBrandPayload,
  ctx: UpdateContext,
): Result<Brand> {
  if (!genreExists(genres, input.genreId)) return fail('NOT_FOUND');
  if (input.form !== brand.form && activeLotsOf(lots, brand.brandId).length > 0) {
    return fail('BRAND_HAS_ACTIVE_LOTS', brand);
  }
  return { ok: true, value: touch(brand, brandFields(input), ctx) };
}

/** 銘柄の削除（論理削除）。有効ロットがあれば BRAND_HAS_ACTIVE_LOTS */
export function deleteBrand(brand: Brand, lots: readonly Lot[], ctx: UpdateContext): Result<Brand> {
  if (activeLotsOf(lots, brand.brandId).length > 0) return fail('BRAND_HAS_ACTIVE_LOTS', brand);
  return { ok: true, value: touch(brand, { isDeleted: true, deletedAt: ctx.now }, ctx) };
}

/** 削除した銘柄の復元。ジャンルがなければ NOT_FOUND */
export function restoreBrand(
  brand: Brand,
  genres: readonly Genre[],
  ctx: UpdateContext,
): Result<Brand> {
  if (!genreExists(genres, brand.genreId)) return fail('NOT_FOUND');
  return { ok: true, value: touch(brand, { isDeleted: false, deletedAt: null }, ctx) };
}
