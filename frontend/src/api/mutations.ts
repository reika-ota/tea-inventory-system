// 更新の操作（詳細設計 7.3）。在庫を変更する操作は楽観的更新を行い、失敗したら元に戻す
import type {
  AdjustLotPayload,
  BrandVersionPayload,
  ConsumePayload,
  CreateBrandPayload,
  GetAllData,
  LotStockResult,
  Lot,
  LotVersionPayload,
  ReceiveLotPayload,
  StockHistory,
  UpdateBrandPayload,
  UpdateLotPayload,
} from '@chaicoss/shared';
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  applyAdjust,
  applyConsume,
  applyDeplete,
  applyReceive,
  applyRestore,
} from '../features/stock/optimistic';
import { useFeedback } from '../feedback/FeedbackContext';
import { queryKeys } from './queries';
import { useApi } from './useApi';

/** 在庫を変更する操作の共通のキー（実行中かどうかの判定に使う） */
const STOCK_MUTATION_KEY = ['stock'] as const;

interface StockMutationOptions<P, D> {
  call(payload: P): Promise<D>;
  /** 対象の銘柄（履歴の再取得に使う） */
  brandIdOf(payload: P, data: GetAllData | undefined): string | undefined;
  /** キャッシュを先に書き換える（楽観的更新しない操作は省略） */
  optimistic?(data: GetAllData, payload: P, histories: StockHistory[] | undefined): GetAllData;
}

function useStockMutation<P, D>({ call, brandIdOf, optimistic }: StockMutationOptions<P, D>) {
  const queryClient = useQueryClient();
  const { notifyError } = useFeedback();

  return useMutation({
    mutationKey: STOCK_MUTATION_KEY,
    mutationFn: call,
    onMutate: async (payload) => {
      // 取得中のデータで書き換えが上書きされないよう、先に取得を止める
      await queryClient.cancelQueries({ queryKey: queryKeys.all });
      const previous = queryClient.getQueryData<GetAllData>(queryKeys.all);
      const brandId = brandIdOf(payload, previous);
      if (previous && optimistic) {
        const histories = brandId
          ? queryClient.getQueryData<StockHistory[]>(queryKeys.histories(brandId))
          : undefined;
        queryClient.setQueryData(queryKeys.all, optimistic(previous, payload, histories));
      }
      return { previous, brandId };
    },
    onError: (error, _payload, context) => {
      // 画面を元に戻し、エラーを通知する
      if (context?.previous) queryClient.setQueryData(queryKeys.all, context.previous);
      notifyError(error);
    },
    onSettled: (_data, _error, _payload, context) => {
      // 成功・失敗にかかわらず、サーバーの最新の状態を取り直す
      void queryClient.invalidateQueries({ queryKey: queryKeys.all });
      if (context?.brandId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.histories(context.brandId) });
      }
    },
  });
}

const brandOfLot = (lotId: string, data: GetAllData | undefined) =>
  data?.lots.find((l) => l.lotId === lotId)?.brandId;

/** 飲んだ */
export function useConsume() {
  const callApi = useApi();
  const { email } = useAuth();
  return useStockMutation<ConsumePayload, LotStockResult>({
    call: (payload) => callApi('consume', payload),
    brandIdOf: (payload) => payload.brandId,
    optimistic: (data, payload) => applyConsume(data, payload, email ?? ''),
  });
}

/** 使い切り */
export function useDepleteLot() {
  const callApi = useApi();
  const { email } = useAuth();
  return useStockMutation<LotVersionPayload, LotStockResult>({
    call: (payload) => callApi('depleteLot', payload),
    brandIdOf: (payload, data) => brandOfLot(payload.lotId, data),
    optimistic: (data, payload) => applyDeplete(data, payload, email ?? ''),
  });
}

/** 使い切りの取り消し */
export function useRestoreLot() {
  const callApi = useApi();
  const { email } = useAuth();
  return useStockMutation<LotVersionPayload, LotStockResult>({
    call: (payload) => callApi('restoreLot', payload),
    brandIdOf: (payload, data) => brandOfLot(payload.lotId, data),
    optimistic: (data, payload, histories) => applyRestore(data, payload, histories, email ?? ''),
  });
}

/** 購入登録 */
export function useReceiveLot() {
  const callApi = useApi();
  const { email } = useAuth();
  return useStockMutation<ReceiveLotPayload, Lot>({
    call: (payload) => callApi('receiveLot', payload),
    brandIdOf: (payload) => payload.brandId,
    optimistic: (data, payload) => applyReceive(data, payload, email ?? ''),
  });
}

/** 残量の修正 */
export function useAdjustLot() {
  const callApi = useApi();
  const { email } = useAuth();
  return useStockMutation<AdjustLotPayload, { lot: Lot; history: StockHistory | null }>({
    call: (payload) => callApi('adjustLot', payload),
    brandIdOf: (payload, data) => brandOfLot(payload.lotId, data),
    optimistic: (data, payload) => applyAdjust(data, payload, email ?? ''),
  });
}

/** 賞味期限・購入日の修正（在庫は増減しないため楽観的更新はせず、成功後に取り直す） */
export function useUpdateLot() {
  const callApi = useApi();
  return useStockMutation<UpdateLotPayload, Lot>({
    call: (payload) => callApi('updateLot', payload),
    brandIdOf: (payload, data) => brandOfLot(payload.lotId, data),
  });
}

/**
 * 在庫を変更する操作を実行中か。実行中は在庫の操作ボタンを無効にする
 * （連打や、前の操作の完了前に次の操作を送ることによる版番号の食い違いを防ぐ）
 */
export function useStockMutating(): boolean {
  return useIsMutating({ mutationKey: STOCK_MUTATION_KEY }) > 0;
}

// ---- マスタ（銘柄・ジャンル）：楽観的更新を行わず、成功後に再取得する（詳細設計 7.3） ----

function useMasterMutation<P, D>(call: (payload: P) => Promise<D>) {
  const queryClient = useQueryClient();
  const { notifyError } = useFeedback();
  return useMutation({
    mutationKey: ['master'],
    mutationFn: call,
    onError: (error) => notifyError(error),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
  });
}

export function useCreateBrand() {
  const callApi = useApi();
  return useMasterMutation((payload: CreateBrandPayload) => callApi('createBrand', payload));
}

export function useUpdateBrand() {
  const callApi = useApi();
  return useMasterMutation((payload: UpdateBrandPayload) => callApi('updateBrand', payload));
}

export function useDeleteBrand() {
  const callApi = useApi();
  return useMasterMutation((payload: BrandVersionPayload) => callApi('deleteBrand', payload));
}

export function useRestoreBrand() {
  const callApi = useApi();
  return useMasterMutation((payload: BrandVersionPayload) => callApi('restoreBrand', payload));
}
