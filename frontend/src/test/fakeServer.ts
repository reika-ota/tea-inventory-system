// テスト用の偽サーバー：shared の計算で在庫を更新し、GAS と同じ形の応答を返す
import type {
  Action,
  ConsumePayload,
  GetAllData,
  LotVersionPayload,
  StockContext,
  StockHistory,
  StockResult,
} from '@chaicoss/shared';
import {
  ERROR_MESSAGES,
  checkLotVersion,
  consumeLot,
  depleteLot,
  planConsume,
  restoreLot,
} from '@chaicoss/shared';
import { ApiCallError } from '../api/client';

export interface FakeServer {
  data: GetAllData;
  histories: StockHistory[];
  /** 受け取った更新系のリクエスト */
  requests: { action: Action; payload: unknown }[];
  handle(action: Action, payload: unknown): unknown;
}

function unwrap<T>(result: StockResult<T>): T {
  if (!result.ok) {
    throw new ApiCallError(result.code, ERROR_MESSAGES[result.code], undefined, result.current);
  }
  return result.value;
}

export function createFakeServer(initial: GetAllData, histories: StockHistory[] = []): FakeServer {
  let seq = 0;
  const ctx = (): StockContext => ({
    userEmail: 'taro@example.com',
    now: '2026-10-12T09:00:00+09:00',
    opId: `op-${seq}`,
    newId: () => `h-${++seq}`,
  });

  const server: FakeServer = {
    data: structuredClone(initial),
    histories: [...histories],
    requests: [],
    handle(action, payload) {
      if (action === 'getAll') return structuredClone(server.data);
      if (action === 'getHistories') {
        const { brandId } = payload as { brandId: string };
        return server.histories.filter((h) => h.brandId === brandId).reverse();
      }
      server.requests.push({ action, payload });
      const save = (result: ReturnType<typeof consumeLot>) => {
        server.data.lots = server.data.lots.map((l) =>
          l.lotId === result.lot.lotId ? result.lot : l,
        );
        server.histories.push(result.history);
        return result;
      };
      const lotOf = (p: LotVersionPayload) =>
        unwrap(
          checkLotVersion(
            server.data.lots.find((l) => l.lotId === p.lotId),
            p.version,
          ),
        );
      switch (action) {
        case 'consume': {
          const input = payload as ConsumePayload;
          const brand = server.data.brands.find((b) => b.brandId === input.brandId);
          return save(consumeLot(unwrap(planConsume(brand, server.data.lots, input)), ctx()));
        }
        case 'depleteLot':
          return save(unwrap(depleteLot(lotOf(payload as LotVersionPayload), ctx())));
        case 'restoreLot':
          return save(
            unwrap(restoreLot(lotOf(payload as LotVersionPayload), server.histories, ctx())),
          );
        default:
          throw new Error(`未対応の action: ${action}`);
      }
    },
  };
  return server;
}
