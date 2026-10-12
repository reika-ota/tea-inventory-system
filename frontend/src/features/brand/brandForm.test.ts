import { MESSAGES } from '@chaicoss/shared';
import { makeBrand } from '@chaicoss/shared/testing';
import { describe, expect, it } from 'vitest';
import {
  addFlavor,
  draftFromBrand,
  draftToInput,
  duplicateNameHint,
  emptyDraft,
  flavorSuggestions,
} from './brandForm';

describe('下書きと入力値', () => {
  it('新規の初期値は茶葉・1杯3g', () => {
    expect(emptyDraft()).toMatchObject({ form: 'LEAF', serving: '3', genreId: null });
  });

  it('既存の銘柄から下書きを作る（ティーバッグは茶葉に切り替えたときのため3gを入れておく）', () => {
    expect(draftFromBrand(makeBrand({ servingAmount: 5, shop: null }))).toMatchObject({
      serving: '5',
      shop: '',
    });
    expect(draftFromBrand(makeBrand({ form: 'BAG', servingAmount: 1 })).serving).toBe('3');
  });

  it('ティーバッグの1杯の量は1、茶葉は入力値（空欄は未入力）', () => {
    const draft = { ...emptyDraft(), name: 'x', genreId: 'g1' };
    expect(draftToInput({ ...draft, form: 'BAG', serving: '7' }).servingAmount).toBe(1);
    expect(draftToInput({ ...draft, serving: '2.5' }).servingAmount).toBe(2.5);
    expect(draftToInput({ ...draft, serving: ' ' }).servingAmount).toBeUndefined();
    expect(draftToInput(emptyDraft()).genreId).toBeUndefined();
  });
});

describe('addFlavor', () => {
  it('前後の空白を除いて追加する。空なら何もしない', () => {
    expect(addFlavor(['桜'], ' 梨 ')).toEqual({ ok: true, flavors: ['桜', '梨'] });
    expect(addFlavor(['桜'], '  ')).toBeNull();
  });

  it('重複・文字数・個数の条件を shared の入力チェックで確認する', () => {
    expect(addFlavor(['桜'], '桜')).toEqual({ ok: false, error: MESSAGES.flavorDuplicate });
    expect(addFlavor([], 'あ'.repeat(21))).toEqual({ ok: false, error: MESSAGES.flavorLength });
    const ten = Array.from({ length: 10 }, (_, i) => `f${i}`);
    expect(addFlavor(ten, '追加')).toEqual({ ok: false, error: MESSAGES.flavorCount });
  });
});

describe('flavorSuggestions', () => {
  it('既存の銘柄のフレーバーを重複なく、追加済みを除いて返す', () => {
    const brands = [makeBrand({ flavors: ['桜', '梨'] }), makeBrand({ flavors: ['梨', 'ミント'] })];
    expect(flavorSuggestions(brands, ['梨'])).toEqual(['桜', 'ミント']);
    expect(flavorSuggestions(brands, [], 2)).toEqual(['桜', '梨']);
  });
});

describe('duplicateNameHint', () => {
  const brands = [
    makeBrand({ brandId: 'a', name: '白牡丹' }),
    makeBrand({ brandId: 'b', name: '水仙', isDeleted: true }),
  ];

  it('同じ名前の銘柄があれば注意する（前後の空白は無視）', () => {
    expect(duplicateNameHint(brands, ' 白牡丹 ', null)).toBe('同じ名前の銘柄がすでにあります');
  });

  it('削除済みと一致する場合は、設定からの復元を案内する', () => {
    expect(duplicateNameHint(brands, '水仙', null)).toBe(
      '削除した銘柄に同じ名前があります（設定から復元できます）',
    );
  });

  it('自分自身（編集中の銘柄）や、一致しない名前は対象外', () => {
    expect(duplicateNameHint(brands, '白牡丹', 'a')).toBeNull();
    expect(duplicateNameHint(brands, '東方美人', null)).toBeNull();
    expect(duplicateNameHint(brands, '', null)).toBeNull();
  });
});
