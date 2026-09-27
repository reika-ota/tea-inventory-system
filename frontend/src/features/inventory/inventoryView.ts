// SC-02 在庫一覧の表示内容（絞り込み・並び替え・注意の件数）を組み立てる純粋関数（UI設計 2.2）
import type { AlertKind, Brand, GetAllData, Genre, IsoDate } from '@chaicoss/shared';
import {
  activeLotsOf,
  alerts,
  fillRatio,
  nearestBestBefore,
  remainingServings,
  totalRemainingQty,
} from '@chaicoss/shared';

export type SortKey = 'attention' | 'name' | 'servings' | 'expiry';
export type FormFilter = 'all' | 'LEAF' | 'BAG';

export interface InventoryFilters {
  /** 銘柄名・フレーバーの部分一致 */
  q: string;
  genreId: string | null;
  form: FormFilter;
  sort: SortKey;
  /** 注意の件数をタップして絞り込んだ種別 */
  alert: AlertKind | null;
}

export const DEFAULT_FILTERS: InventoryFilters = {
  q: '',
  genreId: null,
  form: 'all',
  sort: 'attention',
  alert: null,
};

export const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: 'attention', label: '注意が必要な順' },
  { value: 'name', label: '名前順' },
  { value: 'servings', label: '残りが少ない順' },
  { value: 'expiry', label: '期限が近い順' },
];

export const ALERT_KINDS: readonly AlertKind[] = ['EXPIRED', 'NEAR_EXPIRY', 'LOW'];

/** 一覧の1行に表示する銘柄の情報 */
export interface BrandSummary {
  brand: Brand;
  genre: Genre | undefined;
  alerts: AlertKind[];
  servings: number;
  totalQty: number;
  nearestBestBefore: IsoDate | null;
  fillRatio: number;
}

export interface InventoryView {
  /** 注意の件数（絞り込み前の、在庫のある銘柄で数える） */
  alertCounts: Record<AlertKind, number>;
  /** 在庫のある銘柄の数（「すべて」チップの件数） */
  stockCount: number;
  /** 在庫のあるジャンルと銘柄数（表示順） */
  genreChips: { genre: Genre; count: number }[];
  /** 絞り込み・並び替え後の銘柄 */
  rows: BrandSummary[];
  /** 在庫なし（有効ロットがない、削除していない銘柄） */
  noStock: BrandSummary[];
}

const byName = (a: BrandSummary, b: BrandSummary) => a.brand.name.localeCompare(b.brand.name, 'ja');

const ATTENTION_RANK = { EXPIRED: 0, NEAR_EXPIRY: 1, LOW: 2, NONE: 3 } as const;

/** 注意が必要な順の順位。alerts は強い順（期限切れ→期限間近→残りわずか）に並んでいるため先頭で決まる */
const attentionRank = (s: BrandSummary) => ATTENTION_RANK[s.alerts[0] ?? 'NONE'];

function compare(sort: SortKey) {
  return (a: BrandSummary, b: BrandSummary): number => {
    switch (sort) {
      case 'name':
        return byName(a, b);
      case 'servings':
        return a.servings - b.servings || byName(a, b);
      case 'expiry': {
        // 期限未入力は最後
        const x = a.nearestBestBefore ?? '9999-12-31';
        const y = b.nearestBestBefore ?? '9999-12-31';
        return x === y ? byName(a, b) : x < y ? -1 : 1;
      }
      case 'attention':
        return attentionRank(a) - attentionRank(b) || byName(a, b);
    }
  };
}

function matchesQuery(brand: Brand, q: string): boolean {
  const query = q.trim().toLowerCase();
  if (query === '') return true;
  return (
    brand.name.toLowerCase().includes(query) ||
    brand.flavors.some((flavor) => flavor.toLowerCase().includes(query))
  );
}

export function buildInventoryView(
  data: GetAllData,
  filters: InventoryFilters,
  today: IsoDate,
): InventoryView {
  const summarize = (brand: Brand): BrandSummary => ({
    brand,
    genre: data.genres.find((g) => g.genreId === brand.genreId),
    alerts: alerts(data.lots, brand, today),
    servings: remainingServings(data.lots, brand),
    totalQty: totalRemainingQty(data.lots, brand),
    nearestBestBefore: nearestBestBefore(data.lots, brand),
    fillRatio: fillRatio(data.lots, brand),
  });

  const brands = data.brands.filter((b) => !b.isDeleted);
  const hasStock = (b: Brand) => activeLotsOf(data.lots, b.brandId).length > 0;
  const withStock = brands.filter(hasStock).map(summarize);
  const noStock = brands
    .filter((b) => !hasStock(b))
    .map(summarize)
    .sort(byName);

  const alertCounts = { EXPIRED: 0, NEAR_EXPIRY: 0, LOW: 0 };
  for (const s of withStock) for (const a of s.alerts) alertCounts[a] += 1;

  const genreChips = data.genres
    .map((genre) => ({
      genre,
      count: withStock.filter((s) => s.brand.genreId === genre.genreId).length,
    }))
    .filter((chip) => chip.count > 0);

  const rows = withStock
    .filter(
      (s) =>
        (filters.genreId === null || s.brand.genreId === filters.genreId) &&
        (filters.form === 'all' || s.brand.form === filters.form) &&
        (filters.alert === null || s.alerts.includes(filters.alert)) &&
        matchesQuery(s.brand, filters.q),
    )
    .sort(compare(filters.sort));

  return { alertCounts, stockCount: withStock.length, genreChips, rows, noStock };
}

// ---- URL のクエリ文字列との相互変換（戻る操作や SC-06 からの遷移で絞り込みを保つため） ----

const SORT_KEYS = SORT_OPTIONS.map((o) => o.value);

export function filtersFromParams(params: URLSearchParams): InventoryFilters {
  const form = params.get('form');
  const sort = params.get('sort');
  const alert = params.get('alert');
  return {
    q: params.get('q') ?? '',
    genreId: params.get('genre'),
    form: form === 'LEAF' || form === 'BAG' ? form : 'all',
    sort: SORT_KEYS.find((k) => k === sort) ?? 'attention',
    alert: ALERT_KINDS.find((k) => k === alert) ?? null,
  };
}

export function filtersToParams(filters: InventoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q !== '') params.set('q', filters.q);
  if (filters.genreId !== null) params.set('genre', filters.genreId);
  if (filters.form !== 'all') params.set('form', filters.form);
  if (filters.sort !== 'attention') params.set('sort', filters.sort);
  if (filters.alert !== null) params.set('alert', filters.alert);
  return params;
}
