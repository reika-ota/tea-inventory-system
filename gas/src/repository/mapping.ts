// シートの行（snake_case の列名 → セルの値）とエンティティ（camelCase）の相互変換。
// GAS の API に依存しない純粋関数にして、Vitest でテストする。
import type {
  Brand,
  ColorOption,
  Form,
  Genre,
  IsoDate,
  IsoDateTime,
  Lot,
  StockHistory,
  StockReason,
} from '@chaicoss/shared';
import type { Row } from './schema';

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 日時を JST の ISO 8601（例：2026-09-26T21:30:00+09:00）にする */
export function toJstDateTime(date: Date): IsoDateTime {
  return new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 19) + '+09:00';
}

/** 日時を JST の日付（例：2026-09-26）にする */
export function toJstDate(date: Date): IsoDate {
  return toJstDateTime(date).slice(0, 10);
}

// ---- セルの値の読み取り ----
// 列は書式なしテキストに設定しているが、スプレッドシートを直接編集して日付型になった場合にも対応する。

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function readText(value: unknown): string {
  return isBlank(value) ? '' : String(value);
}

function readNullableText(value: unknown): string | null {
  return isBlank(value) ? null : String(value);
}

function readDate(value: unknown): IsoDate {
  return value instanceof Date ? toJstDate(value) : readText(value);
}

function readNullableDate(value: unknown): IsoDate | null {
  return isBlank(value) ? null : readDate(value);
}

function readDateTime(value: unknown): IsoDateTime {
  return value instanceof Date ? toJstDateTime(value) : readText(value);
}

function readNullableDateTime(value: unknown): IsoDateTime | null {
  return isBlank(value) ? null : readDateTime(value);
}

function readNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (isBlank(value) || !Number.isFinite(n)) {
    throw new Error(`数値ではありません: ${String(value)}`);
  }
  return n;
}

function readNullableNumber(value: unknown): number | null {
  return isBlank(value) ? null : readNumber(value);
}

function readBoolean(value: unknown): boolean {
  return value === true || value === 'TRUE' || value === 'true';
}

function readStringArray(value: unknown): string[] {
  if (isBlank(value)) return [];
  const parsed: unknown = JSON.parse(String(value));
  if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === 'string')) {
    throw new Error(`文字列の配列ではありません: ${String(value)}`);
  }
  return parsed;
}

function readAudit(row: Row) {
  return {
    version: readNumber(row.version),
    createdAt: readDateTime(row.created_at),
    createdBy: readText(row.created_by),
    updatedAt: readDateTime(row.updated_at),
    updatedBy: readText(row.updated_by),
  };
}

function writeAudit(e: Genre | Brand | Lot): Row {
  return {
    version: e.version,
    created_at: e.createdAt,
    created_by: e.createdBy,
    updated_at: e.updatedAt,
    updated_by: e.updatedBy,
  };
}

/** null はシート上では空セルにする */
const blankIfNull = (value: string | number | null): string | number => value ?? '';

// ---- エンティティごとの変換 ----

export function genreFromRow(row: Row): Genre {
  return {
    genreId: readText(row.genre_id),
    name: readText(row.name),
    color: readText(row.color),
    sortOrder: readNumber(row.sort_order),
    ...readAudit(row),
  };
}

export function genreToRow(genre: Genre): Row {
  return {
    genre_id: genre.genreId,
    name: genre.name,
    color: genre.color,
    sort_order: genre.sortOrder,
    ...writeAudit(genre),
  };
}

export function colorFromRow(row: Row): ColorOption {
  return {
    colorCode: readText(row.color_code),
    name: readText(row.name),
    sortOrder: readNumber(row.sort_order),
  };
}

export function colorToRow(color: ColorOption): Row {
  return { color_code: color.colorCode, name: color.name, sort_order: color.sortOrder };
}

export function brandFromRow(row: Row): Brand {
  return {
    brandId: readText(row.brand_id),
    name: readText(row.name),
    genreId: readText(row.genre_id),
    flavors: readStringArray(row.flavors),
    form: readText(row.form) as Form, // 書き込みは入力チェック済みの値のみ
    servingAmount: readNumber(row.serving_amount),
    shop: readNullableText(row.shop),
    memo: readNullableText(row.memo),
    isDeleted: readBoolean(row.is_deleted),
    deletedAt: readNullableDateTime(row.deleted_at),
    ...readAudit(row),
  };
}

export function brandToRow(brand: Brand): Row {
  return {
    brand_id: brand.brandId,
    name: brand.name,
    genre_id: brand.genreId,
    flavors: JSON.stringify(brand.flavors),
    form: brand.form,
    serving_amount: brand.servingAmount,
    shop: blankIfNull(brand.shop),
    memo: blankIfNull(brand.memo),
    is_deleted: brand.isDeleted,
    deleted_at: blankIfNull(brand.deletedAt),
    ...writeAudit(brand),
  };
}

export function lotFromRow(row: Row): Lot {
  return {
    lotId: readText(row.lot_id),
    brandId: readText(row.brand_id),
    initialQty: readNumber(row.initial_qty),
    remainingQty: readNumber(row.remaining_qty),
    bestBefore: readNullableDate(row.best_before),
    purchasedOn: readDate(row.purchased_on),
    isDepleted: readBoolean(row.is_depleted),
    depletedAt: readNullableDateTime(row.depleted_at),
    ...readAudit(row),
  };
}

export function lotToRow(lot: Lot): Row {
  return {
    lot_id: lot.lotId,
    brand_id: lot.brandId,
    initial_qty: lot.initialQty,
    remaining_qty: lot.remainingQty,
    best_before: blankIfNull(lot.bestBefore),
    purchased_on: lot.purchasedOn,
    is_depleted: lot.isDepleted,
    depleted_at: blankIfNull(lot.depletedAt),
    ...writeAudit(lot),
  };
}

export function historyFromRow(row: Row): StockHistory {
  return {
    historyId: readText(row.history_id),
    occurredAt: readDateTime(row.occurred_at),
    userEmail: readText(row.user_email),
    lotId: readText(row.lot_id),
    brandId: readText(row.brand_id),
    delta: readNumber(row.delta),
    servings: readNullableNumber(row.servings),
    qtyAfter: readNumber(row.qty_after),
    reason: readText(row.reason) as StockReason, // 書き込みは処理側で決めた値のみ
    opId: readText(row.op_id),
  };
}

export function historyToRow(history: StockHistory): Row {
  return {
    history_id: history.historyId,
    occurred_at: history.occurredAt,
    user_email: history.userEmail,
    lot_id: history.lotId,
    brand_id: history.brandId,
    delta: history.delta,
    servings: blankIfNull(history.servings),
    qty_after: history.qtyAfter,
    reason: history.reason,
    op_id: history.opId,
  };
}
