import { describe, expect, it } from 'vitest';
import type { Brand, Lot, StockHistory } from '@chaicoss/shared';
import {
  brandFromRow,
  brandToRow,
  genreFromRow,
  historyFromRow,
  historyToRow,
  lotFromRow,
  lotToRow,
} from './mapping';

const audit = {
  version: 2,
  createdAt: '2026-09-26T21:30:00+09:00',
  createdBy: 'a@example.com',
  updatedAt: '2026-09-27T08:00:00+09:00',
  updatedBy: 'b@example.com',
};

describe('銘柄の変換', () => {
  const brand: Brand = {
    ...audit,
    brandId: 'b1',
    name: 'ビスドプランタン',
    genreId: 'g1',
    flavors: ['桜', '梨'],
    form: 'LEAF',
    servingAmount: 5,
    shop: null,
    memo: 'メモ',
    isDeleted: false,
    deletedAt: null,
  };

  it('行にして戻すと元に戻る', () => {
    expect(brandFromRow(brandToRow(brand))).toEqual(brand);
  });

  it('flavors は JSON 文字列、null は空セルにする', () => {
    const row = brandToRow(brand);
    expect(row.flavors).toBe('["桜","梨"]');
    expect(row.shop).toBe('');
    expect(row.deleted_at).toBe('');
  });

  it('スプレッドシートの TRUE/FALSE と空の flavors を読める', () => {
    const row = { ...brandToRow(brand), is_deleted: 'TRUE', flavors: '' };
    expect(brandFromRow(row)).toMatchObject({ isDeleted: true, flavors: [] });
  });

  it('flavors が文字列の配列でなければ例外', () => {
    expect(() => brandFromRow({ ...brandToRow(brand), flavors: '{"a":1}' })).toThrow();
  });
});

describe('ロットの変換', () => {
  const lot: Lot = {
    ...audit,
    lotId: 'l1',
    brandId: 'b1',
    initialQty: 50,
    remainingQty: 12.5,
    bestBefore: null,
    purchasedOn: '2026-09-26',
    isDepleted: false,
    depletedAt: null,
  };

  it('行にして戻すと元に戻る', () => {
    expect(lotFromRow(lotToRow(lot))).toEqual(lot);
  });

  it('日付型のセル（直接編集で自動変換された場合）も JST の文字列として読む', () => {
    const row = {
      ...lotToRow(lot),
      best_before: new Date('2027-03-31T15:00:00Z'), // JST では 2027-04-01 0:00
      purchased_on: new Date('2026-09-25T15:00:00Z'),
    };
    expect(lotFromRow(row)).toMatchObject({ bestBefore: '2027-04-01', purchasedOn: '2026-09-26' });
  });

  it('数値の列が数値でなければ例外（壊れたデータを検知する）', () => {
    expect(() => lotFromRow({ ...lotToRow(lot), remaining_qty: 'abc' })).toThrow();
    expect(() => lotFromRow({ ...lotToRow(lot), remaining_qty: '' })).toThrow();
  });

  it('文字列の数値も読める', () => {
    expect(lotFromRow({ ...lotToRow(lot), remaining_qty: '8.5' }).remainingQty).toBe(8.5);
  });
});

describe('ジャンル・履歴の変換', () => {
  it('ジャンルを読める', () => {
    const row = {
      genre_id: 'g1',
      name: '紅茶',
      color: '#9a3f1c',
      sort_order: 1,
      version: 2,
      created_at: audit.createdAt,
      created_by: audit.createdBy,
      updated_at: audit.updatedAt,
      updated_by: audit.updatedBy,
    };
    expect(genreFromRow(row)).toEqual({
      ...audit,
      genreId: 'g1',
      name: '紅茶',
      color: '#9a3f1c',
      sortOrder: 1,
    });
  });

  it('履歴は行にして戻すと元に戻る（servings の null を含む）', () => {
    const history: StockHistory = {
      historyId: 'h1',
      occurredAt: audit.createdAt,
      userEmail: 'a@example.com',
      lotId: 'l1',
      brandId: 'b1',
      delta: -3,
      servings: null,
      qtyAfter: 5,
      reason: 'CONSUME',
      opId: 'op1',
    };
    expect(historyFromRow(historyToRow(history))).toEqual(history);
    expect(historyFromRow(historyToRow({ ...history, servings: 2 })).servings).toBe(2);
  });
});
