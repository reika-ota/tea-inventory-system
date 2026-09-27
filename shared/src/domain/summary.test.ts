import { describe, expect, it } from 'vitest';
import { makeBrand, makeGenre, makeLot } from '../test/fixtures';
import { summarizeByGenre } from './summary';
import { displayUserName } from './user';

describe('summarizeByGenre', () => {
  const black = makeGenre({ genreId: 'black', name: '紅茶', sortOrder: 2 });
  const green = makeGenre({ genreId: 'green', name: '緑茶', sortOrder: 1 });
  const white = makeGenre({ genreId: 'white', name: '白茶', sortOrder: 3 });

  const brands = [
    makeBrand({ brandId: 'leaf1', genreId: 'black', form: 'LEAF' }),
    makeBrand({ brandId: 'leaf2', genreId: 'black', form: 'LEAF' }),
    makeBrand({ brandId: 'bag1', genreId: 'black', form: 'BAG', servingAmount: 1 }),
    makeBrand({ brandId: 'empty', genreId: 'black', form: 'LEAF' }),
    makeBrand({ brandId: 'deleted', genreId: 'black', isDeleted: true }),
    makeBrand({ brandId: 'green1', genreId: 'green', form: 'LEAF' }),
  ];
  const lots = [
    makeLot({ lotId: '1', brandId: 'leaf1', remainingQty: 8.1 }),
    makeLot({ lotId: '2', brandId: 'leaf1', remainingQty: 0.2 }),
    makeLot({ lotId: '3', brandId: 'leaf2', remainingQty: 12 }),
    makeLot({ lotId: '4', brandId: 'bag1', remainingQty: 8 }),
    makeLot({ lotId: '5', brandId: 'empty', remainingQty: 30, isDepleted: true }),
    makeLot({ lotId: '6', brandId: 'deleted', remainingQty: 5 }),
    makeLot({ lotId: '7', brandId: 'green1', remainingQty: 31 }),
  ];

  const result = summarizeByGenre([black, green, white], brands, lots);

  it('全ジャンルを表示順で返す（在庫のないジャンルも含む）', () => {
    expect(result.map((s) => s.genre.genreId)).toEqual(['green', 'black', 'white']);
  });

  it('銘柄数は有効ロットを持つ（削除していない）銘柄だけを数え、残量は形態別に合計する', () => {
    expect(result[1]).toMatchObject({ brandCount: 3, leafQty: 20.3, bagQty: 8 });
    expect(result[0]).toMatchObject({ brandCount: 1, leafQty: 31, bagQty: 0 });
  });

  it('在庫のないジャンルは0件・0', () => {
    expect(result[2]).toMatchObject({ brandCount: 0, leafQty: 0, bagQty: 0 });
  });
});

describe('displayUserName', () => {
  it('メールアドレスの@より前を返す', () => {
    expect(displayUserName('taro@example.com')).toBe('taro');
  });

  it('@がなければそのまま返す', () => {
    expect(displayUserName('taro')).toBe('taro');
  });
});
