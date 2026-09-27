// シートの定義（基本設計 4）。列の並びは setupSheets で作るヘッダーの順番。
// 読み書きは列名で行うため、スプレッドシート上で列の順番を入れ替えても動作する。

/** text＝書式なしテキスト（UUID・日付・日時・文字列）、number＝数値、boolean＝TRUE/FALSE */
export type ColumnType = 'text' | 'number' | 'boolean';

export interface ColumnDef {
  name: string;
  type: ColumnType;
}

const text = (name: string): ColumnDef => ({ name, type: 'text' });
const number = (name: string): ColumnDef => ({ name, type: 'number' });
const boolean = (name: string): ColumnDef => ({ name, type: 'boolean' });

/** 共通列（genres, brands, lots） */
const AUDIT_COLUMNS: ColumnDef[] = [
  number('version'),
  text('created_at'),
  text('created_by'),
  text('updated_at'),
  text('updated_by'),
];

export const SHEETS = {
  genres: [text('genre_id'), text('name'), text('color'), number('sort_order'), ...AUDIT_COLUMNS],
  colors: [text('color_code'), text('name'), number('sort_order')],
  brands: [
    text('brand_id'),
    text('name'),
    text('genre_id'),
    text('flavors'),
    text('form'),
    number('serving_amount'),
    text('shop'),
    text('memo'),
    boolean('is_deleted'),
    text('deleted_at'),
    ...AUDIT_COLUMNS,
  ],
  lots: [
    text('lot_id'),
    text('brand_id'),
    number('initial_qty'),
    number('remaining_qty'),
    text('best_before'),
    text('purchased_on'),
    boolean('is_depleted'),
    text('depleted_at'),
    ...AUDIT_COLUMNS,
  ],
  stock_histories: [
    text('history_id'),
    text('occurred_at'),
    text('user_email'),
    text('lot_id'),
    text('brand_id'),
    number('delta'),
    number('servings'),
    number('qty_after'),
    text('reason'),
    text('op_id'),
  ],
  operations: [
    text('op_id'),
    text('op_type'),
    text('processed_at'),
    text('user_email'),
    text('result'),
  ],
} as const satisfies Record<string, readonly ColumnDef[]>;

export type SheetName = keyof typeof SHEETS;

/** シートの1行（列名 → セルの値） */
export type Row = Record<string, unknown>;
