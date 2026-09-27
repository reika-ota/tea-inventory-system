import type { StockHistory } from '@chaicoss/shared';
import { describe, expect, it } from 'vitest';
import { newestFirst } from './query';

function history(historyId: string, occurredAt: string, brandId = 'b1'): StockHistory {
  return {
    historyId,
    occurredAt,
    userEmail: 'taro@example.com',
    lotId: 'l1',
    brandId,
    delta: -3,
    servings: 1,
    qtyAfter: 10,
    reason: 'CONSUME',
    opId: `op-${historyId}`,
  };
}

describe('newestFirst', () => {
  it('指定銘柄の履歴だけを、発生日時の新しい順に並べる', () => {
    const histories = [
      history('1', '2026-09-26T10:00:00+09:00'),
      history('2', '2026-09-27T08:00:00+09:00'),
      history('x', '2026-09-28T08:00:00+09:00', 'b2'),
      history('3', '2026-09-26T20:00:00+09:00'),
    ];
    expect(newestFirst(histories, 'b1').map((h) => h.historyId)).toEqual(['2', '3', '1']);
  });

  it('発生日時が同じなら、後から記録したもの（シートの後ろの行）を新しいとみなす', () => {
    const same = '2026-09-27T10:00:00+09:00';
    const histories = [history('in', same), history('adjust', same)];
    expect(newestFirst(histories, 'b1').map((h) => h.historyId)).toEqual(['adjust', 'in']);
  });
});
