// action ごとの payload と data（詳細設計 3.2）
import type { Brand, ColorOption, Form, Genre, IsoDate, Lot, StockHistory, Uuid } from '../types';

export interface GetAllData {
  genres: Genre[];
  colors: ColorOption[];
  brands: Brand[];
  lots: Lot[];
}

export interface GetHistoriesPayload {
  brandId: Uuid;
}

export interface CreateGenrePayload {
  name: string;
  color: string;
  sortOrder: number;
}

export interface UpdateGenrePayload extends CreateGenrePayload {
  genreId: Uuid;
  version: number;
}

export interface DeleteGenrePayload {
  genreId: Uuid;
  version: number;
}

export interface CreateBrandPayload {
  name: string;
  genreId: Uuid;
  flavors: string[];
  form: Form;
  servingAmount: number;
  shop?: string | null;
  memo?: string | null;
}

export interface UpdateBrandPayload extends CreateBrandPayload {
  brandId: Uuid;
  version: number;
}

/** deleteBrand / restoreBrand 共通 */
export interface BrandVersionPayload {
  brandId: Uuid;
  version: number;
}

export interface ReceiveLotPayload {
  brandId: Uuid;
  qty: number;
  bestBefore?: IsoDate | null;
  purchasedOn: IsoDate;
}

/** servings と amount はどちらか一方。両方省略時は servings＝1 */
export interface ConsumePayload {
  brandId: Uuid;
  lotId?: Uuid;
  servings?: number;
  amount?: number;
}

export interface AdjustLotPayload {
  lotId: Uuid;
  version: number;
  remainingQty: number;
}

export interface UpdateLotPayload {
  lotId: Uuid;
  version: number;
  bestBefore?: IsoDate | null;
  purchasedOn: IsoDate;
}

/** depleteLot / restoreLot 共通 */
export interface LotVersionPayload {
  lotId: Uuid;
  version: number;
}

/** 在庫が変動する操作の結果 */
export interface LotStockResult {
  lot: Lot;
  history: StockHistory;
}

/** action 名 → payload・data の対応表 */
export interface ActionMap {
  getAll: { payload: Record<string, never>; data: GetAllData };
  getHistories: { payload: GetHistoriesPayload; data: StockHistory[] };
  createGenre: { payload: CreateGenrePayload; data: Genre };
  updateGenre: { payload: UpdateGenrePayload; data: Genre };
  deleteGenre: { payload: DeleteGenrePayload; data: { genreId: Uuid } };
  createBrand: { payload: CreateBrandPayload; data: Brand };
  updateBrand: { payload: UpdateBrandPayload; data: Brand };
  deleteBrand: { payload: BrandVersionPayload; data: Brand };
  restoreBrand: { payload: BrandVersionPayload; data: Brand };
  receiveLot: { payload: ReceiveLotPayload; data: Lot };
  consume: { payload: ConsumePayload; data: LotStockResult };
  /** 残量が変わらない場合、履歴は記録せず history は null */
  adjustLot: { payload: AdjustLotPayload; data: { lot: Lot; history: StockHistory | null } };
  updateLot: { payload: UpdateLotPayload; data: Lot };
  depleteLot: { payload: LotVersionPayload; data: LotStockResult };
  restoreLot: { payload: LotVersionPayload; data: LotStockResult };
}

export type Action = keyof ActionMap;
export type PayloadOf<A extends Action> = ActionMap[A]['payload'];
export type DataOf<A extends Action> = ActionMap[A]['data'];

/** 参照系 action */
export const QUERY_ACTIONS = ['getAll', 'getHistories'] as const satisfies readonly Action[];

/** 更新系 action（opId 必須。ロック・冪等性チェックの対象） */
export const MUTATION_ACTIONS = [
  'createGenre',
  'updateGenre',
  'deleteGenre',
  'createBrand',
  'updateBrand',
  'deleteBrand',
  'restoreBrand',
  'receiveLot',
  'consume',
  'adjustLot',
  'updateLot',
  'depleteLot',
  'restoreLot',
] as const satisfies readonly Action[];

export type QueryAction = (typeof QUERY_ACTIONS)[number];
export type MutationAction = (typeof MUTATION_ACTIONS)[number];

const ALL_ACTIONS: readonly string[] = [...QUERY_ACTIONS, ...MUTATION_ACTIONS];

export function isAction(value: unknown): value is Action {
  return typeof value === 'string' && ALL_ACTIONS.includes(value);
}

export function isMutationAction(action: Action): action is MutationAction {
  return (MUTATION_ACTIONS as readonly Action[]).includes(action);
}
