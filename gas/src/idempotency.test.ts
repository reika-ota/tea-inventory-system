import { describe, expect, it } from 'vitest';
import { AppError } from './errors';
import { findProcessed } from './idempotency';
import type { OperationRecord } from './repository';

const record: OperationRecord = {
  opId: 'op-1',
  opType: 'consume',
  processedAt: '2026-10-12T09:00:00+09:00',
  userEmail: 'taro@example.com',
  result: JSON.stringify({ lot: { lotId: 'l1', remainingQty: 5 }, history: { historyId: 'h1' } }),
};

describe('findProcessed', () => {
  it('未処理の op_id は processed: false', () => {
    expect(findProcessed([record], 'op-2', 'consume')).toEqual({ processed: false });
  });

  it('処理済みの op_id は、保存した結果をそのまま返す（重複して処理しない）', () => {
    expect(findProcessed([record], 'op-1', 'consume')).toEqual({
      processed: true,
      result: { lot: { lotId: 'l1', remainingQty: 5 }, history: { historyId: 'h1' } },
    });
  });

  it('同じ op_id で別の action なら OP_ID_MISMATCH', () => {
    expect(() => findProcessed([record], 'op-1', 'depleteLot')).toThrow(AppError);
    try {
      findProcessed([record], 'op-1', 'depleteLot');
    } catch (e) {
      expect(e instanceof AppError && e.code).toBe('OP_ID_MISMATCH');
    }
  });
});
