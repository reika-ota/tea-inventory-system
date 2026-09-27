import { describe, expect, it } from 'vitest';
import {
  MESSAGES,
  checkColor,
  checkFlavors,
  checkForm,
  checkId,
  checkOptionalDate,
  checkOptionalText,
  checkQuantity,
  checkRequiredDate,
  checkRequiredText,
  checkServingAmount,
  checkServings,
  checkSortOrder,
  checkVersion,
} from './checks';

const pass = <T>(value: T) => ({ ok: true, value });
const fail = (error: string) => ({ ok: false, error });

describe('checkRequiredText', () => {
  it('前後の空白を除去する', () => {
    expect(checkRequiredText('  紅茶 ', 20)).toEqual(pass('紅茶'));
  });

  it.each([undefined, null, '', '   '])('未入力（%j）はエラー', (value) => {
    expect(checkRequiredText(value, 20)).toEqual(fail(MESSAGES.required));
  });

  it('上限ちょうどは可、超えるとエラー', () => {
    expect(checkRequiredText('あ'.repeat(20), 20).ok).toBe(true);
    expect(checkRequiredText('あ'.repeat(21), 20)).toEqual(fail('20文字以内で入力してください'));
  });

  it('絵文字などサロゲートペアは1文字として数える', () => {
    expect(checkRequiredText('🍵'.repeat(20), 20).ok).toBe(true);
  });

  it('文字列以外はエラー', () => {
    expect(checkRequiredText(123, 20)).toEqual(fail(MESSAGES.invalid));
  });
});

describe('checkOptionalText', () => {
  it('未入力・空白のみは null', () => {
    expect(checkOptionalText(undefined, 50)).toEqual(pass(null));
    expect(checkOptionalText('  ', 50)).toEqual(pass(null));
  });

  it('上限を超えるとエラー', () => {
    expect(checkOptionalText('a'.repeat(51), 50)).toEqual(fail('50文字以内で入力してください'));
  });
});

describe('checkId / checkVersion', () => {
  it('ID は空でない文字列', () => {
    expect(checkId('abc')).toEqual(pass('abc'));
    expect(checkId('').ok).toBe(false);
    expect(checkId(1).ok).toBe(false);
  });

  it('版番号は0以上の整数', () => {
    expect(checkVersion(0)).toEqual(pass(0));
    expect(checkVersion(-1).ok).toBe(false);
    expect(checkVersion(1.5).ok).toBe(false);
    expect(checkVersion('1').ok).toBe(false);
  });
});

describe('checkSortOrder', () => {
  it('0以上の整数', () => {
    expect(checkSortOrder(0)).toEqual(pass(0));
    expect(checkSortOrder(-1)).toEqual(fail(MESSAGES.sortOrder));
    expect(checkSortOrder(1.5)).toEqual(fail(MESSAGES.sortOrder));
    expect(checkSortOrder(undefined)).toEqual(fail(MESSAGES.required));
  });
});

describe('checkColor', () => {
  const codes = ['#9a3f1c', '#7a9a3a'];
  it('色マスタに存在する色コードのみ可', () => {
    expect(checkColor('#9a3f1c', codes)).toEqual(pass('#9a3f1c'));
    expect(checkColor('#000000', codes)).toEqual(fail(MESSAGES.color));
    expect(checkColor(undefined, codes)).toEqual(fail(MESSAGES.color));
  });
});

describe('checkForm', () => {
  it('LEAF／BAG のみ可', () => {
    expect(checkForm('LEAF')).toEqual(pass('LEAF'));
    expect(checkForm('BAG')).toEqual(pass('BAG'));
    expect(checkForm('leaf')).toEqual(fail(MESSAGES.form));
  });
});

describe('checkFlavors', () => {
  it('各要素の前後空白を除去する。未指定は空配列', () => {
    expect(checkFlavors([' 桜 ', '梨'])).toEqual(pass(['桜', '梨']));
    expect(checkFlavors(undefined)).toEqual(pass([]));
  });

  it('空・21文字以上の要素はエラー', () => {
    expect(checkFlavors(['桜', ' '])).toEqual(fail(MESSAGES.flavorLength));
    expect(checkFlavors(['あ'.repeat(21)])).toEqual(fail(MESSAGES.flavorLength));
    expect(checkFlavors(['あ'.repeat(20)]).ok).toBe(true);
  });

  it('10個まで', () => {
    const ten = Array.from({ length: 10 }, (_, i) => `f${i}`);
    expect(checkFlavors(ten).ok).toBe(true);
    expect(checkFlavors([...ten, 'f10'])).toEqual(fail(MESSAGES.flavorCount));
  });

  it('重複は不可（前後空白を除いて比較）', () => {
    expect(checkFlavors(['桜', ' 桜'])).toEqual(fail(MESSAGES.flavorDuplicate));
  });

  it('配列以外・文字列以外の要素はエラー', () => {
    expect(checkFlavors('桜')).toEqual(fail(MESSAGES.invalid));
    expect(checkFlavors([1])).toEqual(fail(MESSAGES.invalid));
  });
});

describe('checkServingAmount', () => {
  it('茶葉は 0.1〜100（小数第1位まで）', () => {
    expect(checkServingAmount(0.1, 'LEAF')).toEqual(pass(0.1));
    expect(checkServingAmount(100, 'LEAF')).toEqual(pass(100));
    expect(checkServingAmount(2.5, 'LEAF')).toEqual(pass(2.5));
    expect(checkServingAmount(0, 'LEAF')).toEqual(fail(MESSAGES.leafServing));
    expect(checkServingAmount(100.1, 'LEAF')).toEqual(fail(MESSAGES.leafServing));
    expect(checkServingAmount(2.55, 'LEAF')).toEqual(fail(MESSAGES.leafServing));
    expect(checkServingAmount(undefined, 'LEAF')).toEqual(fail(MESSAGES.required));
    expect(checkServingAmount('3', 'LEAF')).toEqual(fail(MESSAGES.notNumber));
  });

  it('ティーバッグは 1 固定（未指定なら 1）', () => {
    expect(checkServingAmount(undefined, 'BAG')).toEqual(pass(1));
    expect(checkServingAmount(1, 'BAG')).toEqual(pass(1));
    expect(checkServingAmount(2, 'BAG')).toEqual(fail(MESSAGES.bagServing));
  });
});

describe('checkQuantity', () => {
  it('茶葉は 0.1〜9999（小数第1位まで）', () => {
    expect(checkQuantity(0.1, 'LEAF')).toEqual(pass(0.1));
    expect(checkQuantity(9999, 'LEAF')).toEqual(pass(9999));
    expect(checkQuantity(0, 'LEAF').ok).toBe(false);
    expect(checkQuantity(9999.1, 'LEAF').ok).toBe(false);
    expect(checkQuantity(1.25, 'LEAF')).toEqual(
      fail('0.1〜9999の範囲で、小数第1位まで入力してください'),
    );
  });

  it('茶葉の値は小数の誤差を除いて返す', () => {
    expect(checkQuantity(0.1 + 0.2, 'LEAF')).toEqual(pass(0.3));
  });

  it('ティーバッグは 1〜9999 の整数', () => {
    expect(checkQuantity(1, 'BAG')).toEqual(pass(1));
    expect(checkQuantity(9999, 'BAG')).toEqual(pass(9999));
    expect(checkQuantity(0, 'BAG').ok).toBe(false);
    expect(checkQuantity(1.5, 'BAG')).toEqual(fail('1〜9999の整数で入力してください'));
  });

  it('残量（allowZero）は0を許容する', () => {
    expect(checkQuantity(0, 'LEAF', { allowZero: true })).toEqual(pass(0));
    expect(checkQuantity(0, 'BAG', { allowZero: true })).toEqual(pass(0));
    expect(checkQuantity(-0.1, 'LEAF', { allowZero: true })).toEqual(
      fail('0〜9999の範囲で、小数第1位まで入力してください'),
    );
  });

  it('未入力・数値以外はエラー', () => {
    expect(checkQuantity(undefined, 'LEAF')).toEqual(fail(MESSAGES.required));
    expect(checkQuantity('5', 'LEAF')).toEqual(fail(MESSAGES.notNumber));
    expect(checkQuantity(Number.NaN, 'LEAF')).toEqual(fail(MESSAGES.notNumber));
  });
});

describe('checkServings', () => {
  it('1〜99 の整数', () => {
    expect(checkServings(1)).toEqual(pass(1));
    expect(checkServings(99)).toEqual(pass(99));
    expect(checkServings(0)).toEqual(fail(MESSAGES.servings));
    expect(checkServings(100)).toEqual(fail(MESSAGES.servings));
    expect(checkServings(1.5)).toEqual(fail(MESSAGES.servings));
  });
});

describe('checkRequiredDate / checkOptionalDate', () => {
  it('実在する YYYY-MM-DD のみ可', () => {
    expect(checkRequiredDate('2026-09-27')).toEqual(pass('2026-09-27'));
    expect(checkRequiredDate('2026-02-30')).toEqual(fail(MESSAGES.date));
    expect(checkRequiredDate(undefined)).toEqual(fail(MESSAGES.required));
  });

  it('notAfter を指定すると、その日より後は不可（当日は可）', () => {
    const today = '2026-09-27';
    expect(checkRequiredDate('2026-09-27', { notAfter: today }).ok).toBe(true);
    expect(checkRequiredDate('2026-09-28', { notAfter: today })).toEqual(fail(MESSAGES.futureDate));
  });

  it('任意の日付は未入力なら null', () => {
    expect(checkOptionalDate(undefined)).toEqual(pass(null));
    expect(checkOptionalDate(null)).toEqual(pass(null));
    expect(checkOptionalDate('')).toEqual(pass(null));
    expect(checkOptionalDate('2027-01-31')).toEqual(pass('2027-01-31'));
    expect(checkOptionalDate('2027-01-32')).toEqual(fail(MESSAGES.date));
  });
});
