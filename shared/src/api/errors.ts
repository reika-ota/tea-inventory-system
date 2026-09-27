// エラーコードと利用者向けメッセージ（詳細設計 3.5）

export const ERROR_CODES = [
  'AUTH_INVALID_TOKEN',
  'AUTH_FORBIDDEN',
  'UNKNOWN_ACTION',
  'VALIDATION_ERROR',
  'OP_ID_MISMATCH',
  'NOT_FOUND',
  'VERSION_CONFLICT',
  'INSUFFICIENT_STOCK',
  'NO_ACTIVE_LOT',
  'GENRE_IN_USE',
  'GENRE_NAME_DUPLICATE',
  'BRAND_HAS_ACTIVE_LOTS',
  'LOT_DEPLETED',
  'LOT_NOT_DEPLETED',
  'LOCK_TIMEOUT',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  AUTH_INVALID_TOKEN: 'ログインの有効期限が切れました',
  AUTH_FORBIDDEN: 'このアカウントは利用できません',
  UNKNOWN_ACTION: '不正な操作です',
  VALIDATION_ERROR: '入力内容を確認してください',
  OP_ID_MISMATCH: '不正な操作です',
  NOT_FOUND: '対象のデータが見つかりません',
  VERSION_CONFLICT: '他の人が更新しました。最新の内容を確認してください',
  INSUFFICIENT_STOCK: '残量が足りません',
  NO_ACTIVE_LOT: '在庫がありません',
  GENRE_IN_USE: 'このジャンルは使用中のため削除できません',
  GENRE_NAME_DUPLICATE: '同じ名前のジャンルがあります',
  BRAND_HAS_ACTIVE_LOTS: '在庫が残っているため操作できません',
  LOT_DEPLETED: 'このロットは使い切り済みです',
  LOT_NOT_DEPLETED: 'このロットは使い切りになっていません',
  LOCK_TIMEOUT: '混み合っています。もう一度お試しください',
  INTERNAL_ERROR: 'エラーが発生しました',
};
