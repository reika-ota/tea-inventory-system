// SC-04 銘柄登録・編集フォームの補助（UI設計 2.4）。画面に依存しない純粋関数
import type { Brand, Form } from '@chaicoss/shared';
import { DEFAULT_SERVING, checkFlavors } from '@chaicoss/shared';

/** フォームの入力中の値（数値も入力欄の文字列のまま持つ） */
export interface BrandDraft {
  name: string;
  genreId: string | null;
  flavors: string[];
  form: Form;
  /** 茶葉の1杯の量（g）。ティーバッグは使わない */
  serving: string;
  shop: string;
  memo: string;
}

export function emptyDraft(): BrandDraft {
  return {
    name: '',
    genreId: null,
    flavors: [],
    form: 'LEAF',
    serving: String(DEFAULT_SERVING.LEAF),
    shop: '',
    memo: '',
  };
}

export function draftFromBrand(brand: Brand): BrandDraft {
  return {
    name: brand.name,
    genreId: brand.genreId,
    flavors: [...brand.flavors],
    form: brand.form,
    serving: brand.form === 'LEAF' ? String(brand.servingAmount) : String(DEFAULT_SERVING.LEAF),
    shop: brand.shop ?? '',
    memo: brand.memo ?? '',
  };
}

/** 入力チェック（shared の validateCreateBrand など）に渡す値。ティーバッグの1杯の量は1固定 */
export function draftToInput(draft: BrandDraft) {
  return {
    name: draft.name,
    genreId: draft.genreId ?? undefined,
    flavors: draft.flavors,
    form: draft.form,
    servingAmount:
      draft.form === 'BAG'
        ? DEFAULT_SERVING.BAG
        : draft.serving.trim() === ''
          ? undefined
          : Number(draft.serving),
    shop: draft.shop,
    memo: draft.memo,
  };
}

/** フレーバーを1つ追加する。空なら何もしない（null）。条件に合わなければメッセージを返す */
export function addFlavor(
  flavors: readonly string[],
  raw: string,
): { ok: true; flavors: string[] } | { ok: false; error: string } | null {
  const value = raw.trim();
  if (value === '') return null;
  const checked = checkFlavors([...flavors, value]);
  return checked.ok ? { ok: true, flavors: checked.value } : { ok: false, error: checked.error };
}

/** フレーバーの候補：既存の銘柄のフレーバー（重複なし、追加済みを除く） */
export function flavorSuggestions(
  brands: readonly Brand[],
  current: readonly string[],
  limit = 14,
): string[] {
  const all = [...new Set(brands.flatMap((b) => b.flavors))];
  return all.filter((f) => !current.includes(f)).slice(0, limit);
}

/** 同じ名前の銘柄がある場合の注意（登録はできる）。削除済みと一致する場合は復元を案内する */
export function duplicateNameHint(
  brands: readonly Brand[],
  name: string,
  selfId: string | null,
): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return null;
  const same = brands.filter((b) => b.name === trimmed && b.brandId !== selfId);
  if (same.some((b) => !b.isDeleted)) return '同じ名前の銘柄がすでにあります';
  if (same.length > 0) return '削除した銘柄に同じ名前があります（設定から復元できます）';
  return null;
}
