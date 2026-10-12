// 更新の計算（shared/domain の stock・brand など）で共通に使う型
import type { ErrorCode } from '../api';
import type { IsoDateTime } from '../types';

/** 更新に使う情報（操作者・日時・操作ID・ID の採番） */
export interface UpdateContext {
  userEmail: string;
  now: IsoDateTime;
  opId: string;
  newId: () => string;
}

/** 計算の結果。業務エラーの場合はエラーコードと、利用者に返す最新のデータ（current） */
export type DomainResult<T> =
  { ok: true; value: T } | { ok: false; code: ErrorCode; current?: unknown };

export function fail(code: ErrorCode, current?: unknown): DomainResult<never> {
  return { ok: false, code, ...(current !== undefined && { current }) };
}
