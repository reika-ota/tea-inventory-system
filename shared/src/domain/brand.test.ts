import { describe, expect, it } from 'vitest';
import type { CreateBrandPayload } from '../api';
import { makeBrand, makeGenre, makeLot } from '../test/fixtures';
import { checkBrandVersion, createBrand, deleteBrand, restoreBrand, updateBrand } from './brand';
import type { UpdateContext } from './result';

const ctx: UpdateContext = {
  userEmail: 'hanako@example.com',
  now: '2026-10-12T09:00:00+09:00',
  opId: 'op-1',
  newId: () => 'new-id',
};
const genres = [makeGenre({ genreId: 'g1' }), makeGenre({ genreId: 'g2', name: '緑茶' })];
const input: CreateBrandPayload = {
  name: '白牡丹',
  genreId: 'g1',
  flavors: ['桜'],
  form: 'LEAF',
  servingAmount: 3,
  shop: null,
  memo: 'おいしい',
};
const brand = makeBrand({ brandId: 'b1', genreId: 'g1', version: 3 });
const active = makeLot({ brandId: 'b1' });
const depleted = makeLot({ brandId: 'b1', isDepleted: true });

describe('checkBrandVersion', () => {
  it('版番号が一致すれば銘柄、違えば VERSION_CONFLICT（最新を返す）、なければ NOT_FOUND', () => {
    expect(checkBrandVersion(brand, 3)).toEqual({ ok: true, value: brand });
    expect(checkBrandVersion(brand, 2)).toEqual({
      ok: false,
      code: 'VERSION_CONFLICT',
      current: brand,
    });
    expect(checkBrandVersion(undefined, 1)).toEqual({ ok: false, code: 'NOT_FOUND' });
  });
});

describe('createBrand', () => {
  it('銘柄を作る（版番号1、作成者・日時を記録、購入店の省略は null）', () => {
    const { shop: _shop, ...withoutShop } = input;
    const result = createBrand(genres, withoutShop, ctx);
    expect(result).toEqual({
      ok: true,
      value: {
        brandId: 'new-id',
        name: '白牡丹',
        genreId: 'g1',
        flavors: ['桜'],
        form: 'LEAF',
        servingAmount: 3,
        shop: null,
        memo: 'おいしい',
        isDeleted: false,
        deletedAt: null,
        version: 1,
        createdAt: ctx.now,
        createdBy: ctx.userEmail,
        updatedAt: ctx.now,
        updatedBy: ctx.userEmail,
      },
    });
  });

  it('ジャンルがなければ NOT_FOUND', () => {
    expect(createBrand(genres, { ...input, genreId: 'x' }, ctx)).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
  });
});

describe('updateBrand', () => {
  const update = { ...input, brandId: 'b1', version: 3, name: '白牡丹（新）', genreId: 'g2' };

  it('項目を書き換えて版番号を上げる（作成者は変えない）', () => {
    const result = updateBrand(brand, genres, [active], update, ctx);
    expect(result.ok && result.value).toMatchObject({
      name: '白牡丹（新）',
      genreId: 'g2',
      version: 4,
      updatedBy: ctx.userEmail,
      createdBy: brand.createdBy,
    });
  });

  it('有効ロットがある場合、形態は変えられない（BRAND_HAS_ACTIVE_LOTS）', () => {
    const toBag = { ...update, form: 'BAG' as const, servingAmount: 1 };
    expect(updateBrand(brand, genres, [active], toBag, ctx)).toMatchObject({
      ok: false,
      code: 'BRAND_HAS_ACTIVE_LOTS',
    });
    // 使い切りのロットしかなければ変えられる
    expect(updateBrand(brand, genres, [depleted], toBag, ctx).ok).toBe(true);
  });

  it('ジャンルがなければ NOT_FOUND', () => {
    expect(updateBrand(brand, genres, [], { ...update, genreId: 'x' }, ctx)).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
  });
});

describe('deleteBrand / restoreBrand', () => {
  it('有効ロットがなければ削除（論理削除）できる', () => {
    const result = deleteBrand(brand, [depleted], ctx);
    expect(result.ok && result.value).toMatchObject({
      isDeleted: true,
      deletedAt: ctx.now,
      version: 4,
    });
  });

  it('有効ロットがあれば削除できない（BRAND_HAS_ACTIVE_LOTS）', () => {
    expect(deleteBrand(brand, [active], ctx)).toMatchObject({
      ok: false,
      code: 'BRAND_HAS_ACTIVE_LOTS',
    });
  });

  it('復元すると削除フラグと削除日時を戻す', () => {
    const deleted = makeBrand({ genreId: 'g1', isDeleted: true, deletedAt: ctx.now, version: 4 });
    const result = restoreBrand(deleted, genres, ctx);
    expect(result.ok && result.value).toMatchObject({
      isDeleted: false,
      deletedAt: null,
      version: 5,
    });
  });

  it('ジャンルがなければ復元できない（NOT_FOUND）', () => {
    const orphan = makeBrand({ genreId: 'x', isDeleted: true });
    expect(restoreBrand(orphan, genres, ctx)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });
});
