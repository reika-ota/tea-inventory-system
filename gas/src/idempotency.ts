// 冪等性（詳細設計 6.4）：同じ操作（op_id）を重複して受け取っても、処理は1回だけ行う
import { toJstDateTime } from '@chaicoss/shared';
import { AppError } from './errors';
import type { OperationRecord } from './repository';
import { appendOperation, readOperations } from './repository';

/** 処理済みの操作か。同じ op_id で別の action なら OP_ID_MISMATCH */
export function findProcessed(
  records: readonly OperationRecord[],
  opId: string,
  action: string,
): { processed: false } | { processed: true; result: unknown } {
  const record = records.find((r) => r.opId === opId);
  if (!record) return { processed: false };
  if (record.opType !== action) throw new AppError('OP_ID_MISMATCH');
  return { processed: true, result: JSON.parse(record.result) as unknown };
}

/**
 * op_id が処理済みなら保存済みの結果を返し、未処理なら処理して結果を記録する。
 * 業務エラー（AppError）の場合は記録しない（同じ op_id で再試行できるようにする）。
 * ロックの内側で呼ぶこと。
 */
export function runIdempotent(
  op: { opId: string; action: string; userEmail: string },
  process: () => unknown,
): unknown {
  const found = findProcessed(readOperations(), op.opId, op.action);
  if (found.processed) return found.result;
  const result = process();
  appendOperation({
    opId: op.opId,
    opType: op.action,
    processedAt: toJstDateTime(new Date()),
    userEmail: op.userEmail,
    result: JSON.stringify(result),
  });
  return result;
}
