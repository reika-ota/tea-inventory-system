// テスト用のデータ作成ヘルパー（必要な項目だけ上書きして使う）
import type { Audit, Brand, Genre, Lot } from '../types';

const audit: Audit = {
  version: 1,
  createdAt: '2026-09-01T10:00:00+09:00',
  createdBy: 'owner@example.com',
  updatedAt: '2026-09-01T10:00:00+09:00',
  updatedBy: 'owner@example.com',
};

export function makeGenre(overrides: Partial<Genre> = {}): Genre {
  return { ...audit, genreId: 'g1', name: '紅茶', color: '#9a3f1c', sortOrder: 1, ...overrides };
}

export function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    ...audit,
    brandId: 'b1',
    name: '白牡丹',
    genreId: 'g1',
    flavors: [],
    form: 'LEAF',
    servingAmount: 3,
    shop: null,
    memo: null,
    isDeleted: false,
    deletedAt: null,
    ...overrides,
  };
}

export function makeLot(overrides: Partial<Lot> = {}): Lot {
  return {
    ...audit,
    lotId: 'l1',
    brandId: 'b1',
    initialQty: 50,
    remainingQty: 50,
    bestBefore: null,
    purchasedOn: '2026-09-01',
    isDepleted: false,
    depletedAt: null,
    ...overrides,
  };
}
