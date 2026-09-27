// 初期データ（要件定義 5.1、UI設計 1.6）の組み立て。GAS に依存しない純粋関数。
import type {
  Brand,
  ColorOption,
  Form,
  Genre,
  IsoDate,
  IsoDateTime,
  Lot,
  StockHistory,
} from '@chaicoss/shared';
import { DEFAULT_SERVING, subtractQty } from '@chaicoss/shared';

/** 色マスタの初期値（UI設計 1.6） */
export const SEED_COLORS: readonly ColorOption[] = [
  { colorCode: '#9a3f1c', name: '紅茶色', sortOrder: 1 },
  { colorCode: '#7a9a3a', name: '煎茶色', sortOrder: 2 },
  { colorCode: '#b27a2e', name: '烏龍色', sortOrder: 3 },
  { colorCode: '#cdb97e', name: '白茶色', sortOrder: 4 },
  { colorCode: '#a3b457', name: '若草色', sortOrder: 5 },
  { colorCode: '#b8432b', name: '赤茶色', sortOrder: 6 },
  { colorCode: '#c04a78', name: '果実色', sortOrder: 7 },
  { colorCode: '#4f7f9a', name: '藍色', sortOrder: 8 },
  { colorCode: '#6d5a8c', name: '藤色', sortOrder: 9 },
  { colorCode: '#3f7a63', name: '深緑色', sortOrder: 10 },
  { colorCode: '#8a7a6a', name: '灰茶色', sortOrder: 11 },
];

/** ジャンルの初期値（表示順は並び順、色は UI設計 1.6 の「初期のジャンル」） */
export const SEED_GENRES: readonly { name: string; color: string }[] = [
  { name: '紅茶', color: '#9a3f1c' },
  { name: '緑茶', color: '#7a9a3a' },
  { name: 'ウーロン茶', color: '#b27a2e' },
  { name: '白茶', color: '#cdb97e' },
  { name: 'ジャスミンティー', color: '#a3b457' },
  { name: 'ルイボス', color: '#b8432b' },
  { name: 'フルーツティー', color: '#c04a78' },
];

export interface SeedBrand {
  name: string;
  genre: string;
  flavors: string[];
  form: Form;
  /** 残量（棚卸し時点） */
  qty: number;
  /** 1杯の量。省略時は既定値 */
  serving?: number;
  /** 購入量。省略時は残量と同じ */
  initialQty?: number;
}

/** 銘柄・在庫の初期値（要件定義 5.1、2026-09-26 時点の棚卸し） */
export const SEED_BRANDS: readonly SeedBrand[] = [
  {
    name: 'ビスドプランタン',
    genre: 'フルーツティー',
    flavors: ['桜', '梨', '林檎'],
    form: 'LEAF',
    qty: 8,
    serving: 5,
  },
  {
    name: 'ラビアンローズ',
    genre: 'ルイボス',
    flavors: ['ハイビスカス', 'ローズヒップ'],
    form: 'LEAF',
    qty: 27,
    serving: 3,
  },
  {
    name: 'ウバハイランズクオリティ',
    genre: '紅茶',
    flavors: [],
    form: 'LEAF',
    qty: 8,
    serving: 3,
  },
  { name: '白牡丹', genre: '白茶', flavors: [], form: 'LEAF', qty: 86 },
  { name: '台湾茉莉花茶', genre: 'ジャスミンティー', flavors: [], form: 'LEAF', qty: 49 },
  { name: '桂花烏龍茶', genre: 'ウーロン茶', flavors: ['キンモクセイ'], form: 'LEAF', qty: 60 },
  { name: '水仙', genre: 'ウーロン茶', flavors: [], form: 'LEAF', qty: 31, serving: 8 },
  { name: '宇治やぶきた', genre: '緑茶', flavors: [], form: 'LEAF', qty: 31, serving: 5 },
  {
    name: 'アールグレイグランドクラシック',
    genre: '紅茶',
    flavors: ['アールグレイ'],
    form: 'LEAF',
    qty: 12,
    serving: 3,
  },
  { name: 'ミントブラックティ', genre: '紅茶', flavors: ['ミント'], form: 'BAG', qty: 8 },
  {
    name: 'きらめき果実',
    genre: '紅茶',
    flavors: ['苺', 'マンゴー', 'オレンジ', 'バナナ'],
    form: 'BAG',
    qty: 3,
  },
  { name: '和紅茶', genre: '紅茶', flavors: [], form: 'BAG', qty: 2 },
  { name: 'JAFTEA', genre: '紅茶', flavors: [], form: 'BAG', qty: 1 },
  { name: '東方美人茶', genre: 'ウーロン茶', flavors: [], form: 'BAG', qty: 1 },
];

/** 初期データの購入日（購入日が不明なため棚卸し日とする） */
export const SEED_PURCHASED_ON: IsoDate = '2026-09-26';

export interface SeedData {
  colors: ColorOption[];
  genres: Genre[];
  brands: Brand[];
  lots: Lot[];
  histories: StockHistory[];
}

/**
 * 初期データを組み立てる。
 * @param now 作成日時
 * @param userEmail 作成者（初期データを投入する人）
 * @param newId UUID の採番関数（GAS では Utilities.getUuid）
 * @param seedBrands 銘柄・在庫の初期値（テストで差し替えられるよう引数にしている）
 */
export function buildSeedData(
  now: IsoDateTime,
  userEmail: string,
  newId: () => string,
  seedBrands: readonly SeedBrand[] = SEED_BRANDS,
): SeedData {
  const audit = {
    version: 1,
    createdAt: now,
    createdBy: userEmail,
    updatedAt: now,
    updatedBy: userEmail,
  };

  const genres: Genre[] = SEED_GENRES.map((g, i) => ({
    ...audit,
    genreId: newId(),
    name: g.name,
    color: g.color,
    sortOrder: i + 1,
  }));
  const genreIdOf = (name: string): string => {
    const genre = genres.find((g) => g.name === name);
    if (!genre) throw new Error(`初期データのジャンルがありません: ${name}`);
    return genre.genreId;
  };

  const opId = newId();
  const brands: Brand[] = [];
  const lots: Lot[] = [];
  const histories: StockHistory[] = [];
  for (const seed of seedBrands) {
    const brand: Brand = {
      ...audit,
      brandId: newId(),
      name: seed.name,
      genreId: genreIdOf(seed.genre),
      flavors: seed.flavors,
      form: seed.form,
      servingAmount: seed.form === 'BAG' ? 1 : (seed.serving ?? DEFAULT_SERVING.LEAF),
      shop: null,
      memo: null,
      isDeleted: false,
      deletedAt: null,
    };
    const initialQty = seed.initialQty ?? seed.qty;
    const lot: Lot = {
      ...audit,
      lotId: newId(),
      brandId: brand.brandId,
      initialQty,
      remainingQty: seed.qty,
      bestBefore: null,
      purchasedOn: SEED_PURCHASED_ON,
      isDepleted: false,
      depletedAt: null,
    };
    if (initialQty < seed.qty) {
      throw new Error(`購入量が残量より少なくなっています: ${seed.name}`);
    }
    // 在庫の増減はすべて履歴に残すため、初期データも購入（IN）として記録する。
    // 購入量と残量が違う場合は、差分を残量修正（ADJUST）として記録し、履歴の合計を残量に一致させる
    const base = {
      occurredAt: now,
      userEmail,
      lotId: lot.lotId,
      brandId: brand.brandId,
      servings: null,
      opId,
    };
    histories.push({
      ...base,
      historyId: newId(),
      delta: initialQty,
      qtyAfter: initialQty,
      reason: 'IN',
    });
    if (initialQty !== seed.qty) {
      histories.push({
        ...base,
        historyId: newId(),
        delta: subtractQty(seed.qty, initialQty),
        qtyAfter: seed.qty,
        reason: 'ADJUST',
      });
    }
    brands.push(brand);
    lots.push(lot);
  }

  return { colors: [...SEED_COLORS], genres, brands, lots, histories };
}
