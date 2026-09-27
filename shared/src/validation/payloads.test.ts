import { describe, expect, it } from 'vitest';
import { MESSAGES } from './checks';
import {
  validateAdjustLot,
  validateBrandVersion,
  validateConsume,
  validateCreateBrand,
  validateCreateGenre,
  validateDeleteGenre,
  validateGetHistories,
  validateLotVersion,
  validateReceiveLot,
  validateUpdateBrand,
  validateUpdateGenre,
  validateUpdateLot,
} from './payloads';

const colors = ['#9a3f1c'];
const today = '2026-09-27';

describe('ジャンル', () => {
  it('正しい入力は正規化して返す', () => {
    expect(validateCreateGenre({ name: ' 紅茶 ', color: '#9a3f1c', sortOrder: 1 }, colors)).toEqual(
      {
        ok: true,
        value: { name: '紅茶', color: '#9a3f1c', sortOrder: 1 },
      },
    );
  });

  it('複数の項目のエラーをまとめて返す', () => {
    expect(validateCreateGenre({ name: '', color: '#000000', sortOrder: -1 }, colors)).toEqual({
      ok: false,
      fieldErrors: {
        name: MESSAGES.required,
        color: MESSAGES.color,
        sortOrder: MESSAGES.sortOrder,
      },
    });
  });

  it('更新は genreId と version も必要', () => {
    const result = validateUpdateGenre({ name: '紅茶', color: '#9a3f1c', sortOrder: 1 }, colors);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.fieldErrors)).toEqual(['genreId', 'version']);
  });

  it('削除は genreId と version', () => {
    expect(validateDeleteGenre({ genreId: 'g1', version: 3 })).toEqual({
      ok: true,
      value: { genreId: 'g1', version: 3 },
    });
  });

  it('payload がオブジェクトでなければ、各項目のエラーになる', () => {
    expect(validateDeleteGenre(null).ok).toBe(false);
    expect(validateDeleteGenre([]).ok).toBe(false);
  });
});

describe('銘柄', () => {
  const leaf = {
    name: ' 白牡丹 ',
    genreId: 'g1',
    flavors: [' 桜 '],
    form: 'LEAF',
    servingAmount: 3,
    shop: '',
    memo: ' おいしい ',
  };

  it('正しい入力は正規化して返す（空の購入店は null）', () => {
    expect(validateCreateBrand(leaf)).toEqual({
      ok: true,
      value: {
        name: '白牡丹',
        genreId: 'g1',
        flavors: ['桜'],
        form: 'LEAF',
        servingAmount: 3,
        shop: null,
        memo: 'おいしい',
      },
    });
  });

  it('ティーバッグは1杯の量を省略でき、1 になる', () => {
    const result = validateCreateBrand({ name: 'JAFTEA', genreId: 'g1', form: 'BAG' });
    expect(result.ok && result.value.servingAmount).toBe(1);
    expect(result.ok && result.value.flavors).toEqual([]);
  });

  it('形態が不正な場合は形態のエラーだけを返す（1杯の量は判定しない）', () => {
    expect(validateCreateBrand({ ...leaf, form: 'CAN', servingAmount: 1000 })).toEqual({
      ok: false,
      fieldErrors: { form: MESSAGES.form },
    });
  });

  it('更新は brandId と version も必要', () => {
    const result = validateUpdateBrand({ ...leaf, brandId: 'b1', version: 2 });
    expect(result.ok && result.value.brandId).toBe('b1');
    expect(validateUpdateBrand(leaf).ok).toBe(false);
  });

  it('削除・復元は brandId と version', () => {
    expect(validateBrandVersion({ brandId: 'b1', version: 1 }).ok).toBe(true);
    expect(validateBrandVersion({ brandId: 'b1' }).ok).toBe(false);
  });
});

describe('在庫', () => {
  it('履歴取得は brandId が必要', () => {
    expect(validateGetHistories({ brandId: 'b1' })).toEqual({ ok: true, value: { brandId: 'b1' } });
    expect(validateGetHistories({}).ok).toBe(false);
  });

  describe('validateReceiveLot', () => {
    it('賞味期限は任意（未入力は null）', () => {
      expect(
        validateReceiveLot({ brandId: 'b1', qty: 50, purchasedOn: today }, 'LEAF', today),
      ).toEqual({
        ok: true,
        value: { brandId: 'b1', qty: 50, bestBefore: null, purchasedOn: today },
      });
    });

    it('購入日は当日以前、購入量は形態に合わせてチェックする', () => {
      expect(
        validateReceiveLot({ brandId: 'b1', qty: 2.5, purchasedOn: '2026-09-28' }, 'BAG', today),
      ).toEqual({
        ok: false,
        fieldErrors: { qty: '1〜9999の整数で入力してください', purchasedOn: MESSAGES.futureDate },
      });
    });
  });

  describe('validateConsume', () => {
    it('杯数・量とも省略すると杯数1', () => {
      expect(validateConsume({ brandId: 'b1' }, 'LEAF')).toEqual({
        ok: true,
        value: { brandId: 'b1', servings: 1 },
      });
    });

    it('杯数を指定できる（ロット指定あり）', () => {
      expect(validateConsume({ brandId: 'b1', lotId: 'l1', servings: 2 }, 'LEAF')).toEqual({
        ok: true,
        value: { brandId: 'b1', lotId: 'l1', servings: 2 },
      });
    });

    it('量を指定できる（形態に合わせてチェック）', () => {
      expect(validateConsume({ brandId: 'b1', amount: 2.5 }, 'LEAF')).toEqual({
        ok: true,
        value: { brandId: 'b1', amount: 2.5 },
      });
      expect(validateConsume({ brandId: 'b1', amount: 2.5 }, 'BAG').ok).toBe(false);
    });

    it('杯数と量の両方指定はエラー', () => {
      expect(validateConsume({ brandId: 'b1', servings: 1, amount: 3 }, 'LEAF')).toEqual({
        ok: false,
        fieldErrors: { amount: MESSAGES.servingsAndAmount },
      });
    });

    it('杯数の範囲外・不正なロットIDはエラー', () => {
      expect(validateConsume({ brandId: 'b1', servings: 100 }, 'LEAF')).toEqual({
        ok: false,
        fieldErrors: { servings: MESSAGES.servings },
      });
      expect(validateConsume({ brandId: 'b1', lotId: '' }, 'LEAF')).toEqual({
        ok: false,
        fieldErrors: { lotId: MESSAGES.invalid },
      });
    });
  });

  it('残量修正は0を許容する', () => {
    expect(validateAdjustLot({ lotId: 'l1', version: 1, remainingQty: 0 }, 'LEAF')).toEqual({
      ok: true,
      value: { lotId: 'l1', version: 1, remainingQty: 0 },
    });
    expect(validateAdjustLot({ lotId: 'l1', version: 1, remainingQty: -1 }, 'LEAF').ok).toBe(false);
  });

  it('賞味期限・購入日の修正', () => {
    expect(
      validateUpdateLot(
        { lotId: 'l1', version: 1, bestBefore: '', purchasedOn: '2026-09-01' },
        today,
      ),
    ).toEqual({
      ok: true,
      value: { lotId: 'l1', version: 1, bestBefore: null, purchasedOn: '2026-09-01' },
    });
    expect(validateUpdateLot({ lotId: 'l1', version: 1 }, today)).toEqual({
      ok: false,
      fieldErrors: { purchasedOn: MESSAGES.required },
    });
  });

  it('使い切り・取り消しは lotId と version', () => {
    expect(validateLotVersion({ lotId: 'l1', version: 1 }).ok).toBe(true);
    expect(validateLotVersion({ version: 1 }).ok).toBe(false);
  });
});
