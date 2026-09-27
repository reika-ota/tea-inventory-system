import type { GetAllData } from '@chaicoss/shared';
import { makeBrand, makeGenre, makeLot } from '@chaicoss/shared/testing';
import { describe, expect, it } from 'vitest';
import type { InventoryFilters } from './inventoryView';
import {
  DEFAULT_FILTERS,
  buildInventoryView,
  filtersFromParams,
  filtersToParams,
} from './inventoryView';

const today = '2026-09-27';
const black = makeGenre({ genreId: 'black', name: '紅茶', sortOrder: 1 });
const oolong = makeGenre({ genreId: 'oolong', name: 'ウーロン茶', sortOrder: 2 });
const white = makeGenre({ genreId: 'white', name: '白茶', sortOrder: 3 });

// 期限切れ・期限間近・残りわずか・注意なし・在庫なし・削除済みの銘柄
const data: GetAllData = {
  genres: [black, oolong, white],
  colors: [],
  brands: [
    makeBrand({
      brandId: 'expired',
      name: 'アールグレイ',
      genreId: 'black',
      flavors: ['ベルガモット'],
    }),
    makeBrand({
      brandId: 'near',
      name: '桂花烏龍茶',
      genreId: 'oolong',
      flavors: ['キンモクセイ'],
    }),
    makeBrand({ brandId: 'low', name: 'JAFTEA', genreId: 'black', form: 'BAG', servingAmount: 1 }),
    makeBrand({ brandId: 'ok', name: 'ウバ', genreId: 'black' }),
    makeBrand({ brandId: 'empty', name: '水仙', genreId: 'oolong' }),
    makeBrand({ brandId: 'deleted', name: '削除済み', genreId: 'black', isDeleted: true }),
  ],
  lots: [
    makeLot({ lotId: '1', brandId: 'expired', remainingQty: 30, bestBefore: '2026-09-01' }),
    makeLot({ lotId: '2', brandId: 'near', remainingQty: 60, bestBefore: '2026-10-10' }),
    makeLot({ lotId: '3', brandId: 'low', remainingQty: 2, initialQty: 20 }),
    makeLot({ lotId: '4', brandId: 'ok', remainingQty: 45, bestBefore: '2027-05-01' }),
    makeLot({ lotId: '5', brandId: 'empty', remainingQty: 0, isDepleted: true }),
  ],
};

const view = (filters: Partial<InventoryFilters> = {}) =>
  buildInventoryView(data, { ...DEFAULT_FILTERS, ...filters }, today);
const ids = (filters: Partial<InventoryFilters> = {}) =>
  view(filters).rows.map((s) => s.brand.brandId);

describe('buildInventoryView', () => {
  it('在庫のある銘柄を、注意が必要な順（同じなら名前順）に並べる', () => {
    expect(ids()).toEqual(['expired', 'near', 'low', 'ok']);
  });

  it('注意の件数を数える', () => {
    expect(view().alertCounts).toEqual({ EXPIRED: 1, NEAR_EXPIRY: 1, LOW: 1 });
  });

  it('在庫なし枠は、有効ロットがない削除していない銘柄', () => {
    expect(view().noStock.map((s) => s.brand.brandId)).toEqual(['empty']);
  });

  it('ジャンルチップは在庫のあるジャンルだけを件数付きで表示順に返す', () => {
    const v = view();
    expect(v.stockCount).toBe(4);
    expect(v.genreChips.map((c) => [c.genre.name, c.count])).toEqual([
      ['紅茶', 3],
      ['ウーロン茶', 1],
    ]);
  });

  it('行には残り杯数・合計残量・最も近い期限・塗りの割合を持つ', () => {
    const low = view().rows.find((s) => s.brand.brandId === 'low');
    expect(low).toMatchObject({
      servings: 2,
      totalQty: 2,
      nearestBestBefore: null,
      fillRatio: 0.1,
      alerts: ['LOW'],
    });
  });

  describe('絞り込み', () => {
    it('ジャンル', () => {
      expect(ids({ genreId: 'oolong' })).toEqual(['near']);
    });

    it('形態', () => {
      expect(ids({ form: 'BAG' })).toEqual(['low']);
    });

    it('注意の種別', () => {
      expect(ids({ alert: 'NEAR_EXPIRY' })).toEqual(['near']);
    });

    it('検索は銘柄名とフレーバーの部分一致（大文字・小文字を区別しない）', () => {
      expect(ids({ q: 'jaf' })).toEqual(['low']);
      expect(ids({ q: 'キンモク' })).toEqual(['near']);
      expect(ids({ q: '  ' })).toHaveLength(4);
    });

    it('条件を組み合わせる。該当なしは空', () => {
      expect(ids({ genreId: 'black', form: 'LEAF' })).toEqual(['expired', 'ok']);
      expect(ids({ genreId: 'oolong', form: 'BAG' })).toEqual([]);
    });

    it('絞り込んでも注意の件数とチップの件数は変わらない', () => {
      expect(view({ genreId: 'oolong' }).alertCounts).toEqual({
        EXPIRED: 1,
        NEAR_EXPIRY: 1,
        LOW: 1,
      });
    });
  });

  describe('並び替え', () => {
    it('名前順（日本語の並び。英字→かな→漢字）', () => {
      // JAFTEA → アールグレイ → ウバ → 桂花烏龍茶
      expect(ids({ sort: 'name' })).toEqual(['low', 'expired', 'ok', 'near']);
    });

    it('残りが少ない順', () => {
      expect(ids({ sort: 'servings' })).toEqual(['low', 'expired', 'ok', 'near']);
    });

    it('期限が近い順（期限未入力は最後）', () => {
      expect(ids({ sort: 'expiry' })).toEqual(['expired', 'near', 'ok', 'low']);
    });
  });
});

describe('URL のクエリ文字列との変換', () => {
  it('初期値の項目は書かない', () => {
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('');
  });

  it('変換して戻すと元に戻る', () => {
    const filters: InventoryFilters = {
      q: '桜',
      genreId: 'g1',
      form: 'LEAF',
      sort: 'expiry',
      alert: 'LOW',
    };
    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
  });

  it('不正な値は初期値にする', () => {
    expect(filtersFromParams(new URLSearchParams('form=CAN&sort=x&alert=y'))).toEqual(
      DEFAULT_FILTERS,
    );
  });
});
