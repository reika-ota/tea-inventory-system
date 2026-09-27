import type { ApiError, ApiResponse, ErrorCode } from '@chaicoss/shared';
import { ERROR_MESSAGES } from '@chaicoss/shared';

/** 利用者に返すエラー。サービスで throw し、router で ApiResponse に変換する */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly details: Pick<ApiError, 'fieldErrors' | 'current'> = {},
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = 'AppError';
  }
}

export function success<D>(data: D): ApiResponse<D> {
  return { ok: true, data };
}

export function failure(
  code: ErrorCode,
  details: Pick<ApiError, 'fieldErrors' | 'current'> = {},
): ApiResponse<never> {
  return { ok: false, error: { code, message: ERROR_MESSAGES[code], ...details } };
}
