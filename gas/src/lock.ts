// 排他制御（詳細設計 6.3）
import { AppError } from './errors';

/** ロックを待つ上限 */
const LOCK_WAIT_MS = 10_000;

/**
 * スクリプト全体のロックを取得して処理する。取得できなければ LOCK_TIMEOUT。
 * 書き込みを確定（flush）してからロックを解放し、次の処理が古い値を読まないようにする。
 */
export function withLock<T>(fn: () => T): T {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) throw new AppError('LOCK_TIMEOUT');
  try {
    const result = fn();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}
