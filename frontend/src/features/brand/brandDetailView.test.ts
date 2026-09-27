import type { GetAllData } from '@chaicoss/shared';
import { makeBrand, makeGenre, makeLot } from '@chaicoss/shared/testing';
import { describe, expect, it } from 'vitest';
import { buildBrandDetailView } from './brandDetailView';

const today = '2026-09-27';

const data: GetAllData = {
  genres: [makeGenre({ genreId: 'g1' })],
  colors: [],
  brands: [makeBrand({ brandId: 'b1', genreId: 'g1', servingAmount: 3 })],
  lots: [
    makeLot({ lotId: 'later', bestBefore: '2027-06-01', initialQty: 50, remainingQty: 40 }),
    makeLot({ lotId: 'sooner', bestBefore: '2026-10-01', initialQty: 50, remainingQty: 5 }),
    makeLot({ lotId: 'none', bestBefore: null, initialQty: 100, remainingQty: 100 }),
    makeLot({ lotId: 'old', isDepleted: true, depletedAt: '2026-08-01T10:00:00+09:00' }),
    makeLot({ lotId: 'new', isDepleted: true, depletedAt: '2026-09-01T10:00:00+09:00' }),
    makeLot({ lotId: 'other', brandId: 'b2' }),
  ],
};

describe('buildBrandDetailView', () => {
  const view = buildBrandDetailView(data, 'b1', today);

  it('有効ロットを引当の順に並べ、先頭を「次に使う」にする', () => {
    expect(view?.activeLots.map((v) => [v.lot.lotId, v.isNext])).toEqual([
      ['sooner', true],
      ['later', false],
      ['none', false],
    ]);
  });

  it('ロットの強調は期限によるものだけ（残量が少なくても残りわずかは付けない）', () => {
    expect(view?.activeLots[0]?.alerts).toEqual(['NEAR_EXPIRY']);
  });

  it('残量バーの割合', () => {
    expect(view?.activeLots.map((v) => v.ratio)).toEqual([0.1, 0.8, 1]);
  });

  it('使い切ったロットは、使い切りにした日時の新しい順', () => {
    expect(view?.depletedLots.map((l) => l.lotId)).toEqual(['new', 'old']);
  });

  it('銘柄の合計残量・残り杯数・強調', () => {
    expect(view).toMatchObject({ totalQty: 145, servings: 48, alerts: ['NEAR_EXPIRY'] });
    expect(view?.genre?.genreId).toBe('g1');
  });

  it('銘柄が見つからなければ null', () => {
    expect(buildBrandDetailView(data, 'missing', today)).toBeNull();
  });
});
