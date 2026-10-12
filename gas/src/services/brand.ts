// 銘柄マスタの更新（createBrand・updateBrand・deleteBrand・restoreBrand）。マスタのため履歴は記録しない
import type {
  Brand,
  BrandVersionPayload,
  CreateBrandPayload,
  UpdateBrandPayload,
} from '@chaicoss/shared';
import {
  checkBrandVersion,
  createBrand as createBrandRule,
  deleteBrand as deleteBrandRule,
  restoreBrand as restoreBrandRule,
  updateBrand as updateBrandRule,
} from '@chaicoss/shared';
import {
  appendBrands,
  readBrands,
  readGenres,
  readLots,
  updateBrand as updateBrandRow,
} from '../repository';
import type { MutationContext } from '../router';
import { unwrap, updateContext } from './common';

const findBrand = (brandId: string) => readBrands().find((b) => b.brandId === brandId);

export function createBrand(input: CreateBrandPayload, ctx: MutationContext): Brand {
  const brand = unwrap(createBrandRule(readGenres(), input, updateContext(ctx)));
  appendBrands([brand]);
  return brand;
}

export function updateBrand(input: UpdateBrandPayload, ctx: MutationContext): Brand {
  const brand = unwrap(checkBrandVersion(findBrand(input.brandId), input.version));
  const updated = unwrap(
    updateBrandRule(brand, readGenres(), readLots(), input, updateContext(ctx)),
  );
  updateBrandRow(updated);
  return updated;
}

export function deleteBrand(input: BrandVersionPayload, ctx: MutationContext): Brand {
  const brand = unwrap(checkBrandVersion(findBrand(input.brandId), input.version));
  const updated = unwrap(deleteBrandRule(brand, readLots(), updateContext(ctx)));
  updateBrandRow(updated);
  return updated;
}

export function restoreBrand(input: BrandVersionPayload, ctx: MutationContext): Brand {
  const brand = unwrap(checkBrandVersion(findBrand(input.brandId), input.version));
  const updated = unwrap(restoreBrandRule(brand, readGenres(), updateContext(ctx)));
  updateBrandRow(updated);
  return updated;
}
