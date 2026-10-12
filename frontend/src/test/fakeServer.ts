// テスト用の偽サーバー：shared の計算で在庫を更新し、GAS と同じ形の応答を返す
import type {
  Action,
  AdjustLotPayload,
  Brand,
  BrandVersionPayload,
  ConsumePayload,
  CreateBrandPayload,
  GetAllData,
  LotVersionPayload,
  ReceiveLotPayload,
  StockContext,
  StockHistory,
  DomainResult,
  UpdateBrandPayload,
  UpdateLotPayload,
} from '@chaicoss/shared';
import {
  ERROR_MESSAGES,
  adjustLot,
  checkBrandVersion,
  createBrand,
  deleteBrand,
  restoreBrand,
  updateBrand,
  checkLotVersion,
  consumeLot,
  depleteLot,
  planConsume,
  receiveLot,
  restoreLot,
  updateLotDates,
} from '@chaicoss/shared';
import { ApiCallError } from '../api/client';

export interface FakeServer {
  data: GetAllData;
  histories: StockHistory[];
  /** 受け取った更新系のリクエスト */
  requests: { action: Action; payload: unknown }[];
  handle(action: Action, payload: unknown): unknown;
}

function unwrap<T>(result: DomainResult<T>): T {
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
        case 'receiveLot': {
          const input = payload as ReceiveLotPayload;
          const brand = server.data.brands.find((b) => b.brandId === input.brandId);
          const result = unwrap(receiveLot(brand, input, ctx()));
          server.data.lots.push(result.lot);
          server.histories.push(result.history);
          return result.lot;
        }
        case 'adjustLot': {
          const input = payload as AdjustLotPayload;
          const result = unwrap(adjustLot(lotOf(input), input.remainingQty, ctx()));
          if (result.history) save({ lot: result.lot, history: result.history });
          return result;
        }
        case 'updateLot': {
          const input = payload as UpdateLotPayload;
          const lot = updateLotDates(lotOf(input), input, ctx());
          server.data.lots = server.data.lots.map((l) => (l.lotId === lot.lotId ? lot : l));
          return lot;
        }
        case 'createBrand': {
          const brand = unwrap(
            createBrand(server.data.genres, payload as CreateBrandPayload, ctx()),
          );
          server.data.brands.push(brand);
          return brand;
        }
        case 'updateBrand':
        case 'deleteBrand':
        case 'restoreBrand': {
          const input = payload as BrandVersionPayload;
          const brand = unwrap(
            checkBrandVersion(
              server.data.brands.find((b) => b.brandId === input.brandId),
              input.version,
            ),
          );
          const updated: Brand = unwrap(
            action === 'updateBrand'
              ? updateBrand(
                  brand,
                  server.data.genres,
                  server.data.lots,
                  payload as UpdateBrandPayload,
                  ctx(),
                )
              : action === 'deleteBrand'
                ? deleteBrand(brand, server.data.lots, ctx())
                : restoreBrand(brand, server.data.genres, ctx()),
          );
          server.data.brands = server.data.brands.map((b) =>
            b.brandId === updated.brandId ? updated : b,
          );
          return updated;
        }
        default:
          throw new Error(`未対応の action: ${action}`);
      }
    },
  };
  return server;
}
