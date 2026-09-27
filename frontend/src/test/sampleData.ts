// 画面のテスト用データ（期限切れ・期限間近・残りわずか・注意なし・在庫なしの銘柄）
import type { GetAllData, StockHistory } from '@chaicoss/shared';
import { makeBrand, makeGenre, makeLot } from '@chaicoss/shared/testing';

export const sampleData: GetAllData = {
  genres: [
    makeGenre({ genreId: 'black', name: '紅茶', color: '#9a3f1c', sortOrder: 1 }),
    makeGenre({ genreId: 'oolong', name: 'ウーロン茶', color: '#b27a2e', sortOrder: 2 }),
  ],
  colors: [],
  brands: [
    makeBrand({
      brandId: 'earl',
      name: 'アールグレイ',
      genreId: 'black',
      flavors: ['ベルガモット'],
      shop: '紅茶専門店',
    }),
    makeBrand({ brandId: 'kei', name: '桂花烏龍茶', genreId: 'oolong', flavors: ['キンモクセイ'] }),
    makeBrand({ brandId: 'jaf', name: 'JAFTEA', genreId: 'black', form: 'BAG', servingAmount: 1 }),
    makeBrand({ brandId: 'suisen', name: '水仙', genreId: 'oolong' }),
  ],
  lots: [
    makeLot({ lotId: 'e1', brandId: 'earl', remainingQty: 30, bestBefore: '2000-01-01' }),
    makeLot({ lotId: 'k1', brandId: 'kei', remainingQty: 45.5, bestBefore: '2099-12-31' }),
    makeLot({
      lotId: 'k2',
      brandId: 'kei',
      remainingQty: 20,
      bestBefore: null,
      purchasedOn: '2026-08-01',
    }),
    makeLot({ lotId: 'j1', brandId: 'jaf', initialQty: 20, remainingQty: 2 }),
    makeLot({
      lotId: 's1',
      brandId: 'suisen',
      remainingQty: 0,
      isDepleted: true,
      depletedAt: '2026-09-20T10:00:00+09:00',
    }),
  ],
};

export const sampleHistories: StockHistory[] = [
  {
    historyId: 'h2',
    occurredAt: '2026-09-27T08:00:00+09:00',
    userEmail: 'hanako@example.com',
    lotId: 'k1',
    brandId: 'kei',
    delta: -6,
    servings: 2,
    qtyAfter: 45.5,
    reason: 'CONSUME',
    opId: 'op2',
  },
  {
    historyId: 'h1',
    occurredAt: '2026-09-26T10:00:00+09:00',
    userEmail: 'taro@example.com',
    lotId: 'k1',
    brandId: 'kei',
    delta: 51.5,
    servings: null,
    qtyAfter: 51.5,
    reason: 'IN',
    opId: 'op1',
  },
];
