// 在庫を変更する操作（詳細設計 7.3）：楽観的更新を行い、失敗したら元に戻す
import type {
  ConsumePayload,
  GetAllData,
  LotStockResult,
  LotVersionPayload,
  StockHistory,
} from '@chaicoss/shared';
import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { applyConsume, applyDeplete, applyRestore } from '../features/stock/optimistic';
import { useFeedback } from '../feedback/FeedbackContext';
import { queryKeys } from './queries';
import { useApi } from './useApi';

/** 在庫を変更する操作の共通のキー（実行中かどうかの判定に使う） */
const STOCK_MUTATION_KEY = ['stock'] as const;

interface StockMutationOptions<P> {
  call(payload: P): Promise<LotStockResult>;
  /** 対象の銘柄（履歴の再取得に使う） */
  brandIdOf(payload: P, data: GetAllData | undefined): string | undefined;
  /** キャッシュを先に書き換える */
  optimistic(data: GetAllData, payload: P, histories: StockHistory[] | undefined): GetAllData;
}

function useStockMutation<P>({ call, brandIdOf, optimistic }: StockMutationOptions<P>) {
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
      if (previous) {
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
  return useStockMutation<ConsumePayload>({
    call: (payload) => callApi('consume', payload),
    brandIdOf: (payload) => payload.brandId,
    optimistic: (data, payload) => applyConsume(data, payload, email ?? ''),
  });
}

/** 使い切り */
export function useDepleteLot() {
  const callApi = useApi();
  const { email } = useAuth();
  return useStockMutation<LotVersionPayload>({
    call: (payload) => callApi('depleteLot', payload),
    brandIdOf: (payload, data) => brandOfLot(payload.lotId, data),
    optimistic: (data, payload) => applyDeplete(data, payload, email ?? ''),
  });
}

/** 使い切りの取り消し */
export function useRestoreLot() {
  const callApi = useApi();
  const { email } = useAuth();
  return useStockMutation<LotVersionPayload>({
    call: (payload) => callApi('restoreLot', payload),
    brandIdOf: (payload, data) => brandOfLot(payload.lotId, data),
    optimistic: (data, payload, histories) => applyRestore(data, payload, histories, email ?? ''),
  });
}

/**
 * 在庫を変更する操作を実行中か。実行中は在庫の操作ボタンを無効にする
 * （連打や、前の操作の完了前に次の操作を送ることによる版番号の食い違いを防ぐ）
 */
export function useStockMutating(): boolean {
  return useIsMutating({ mutationKey: STOCK_MUTATION_KEY }) > 0;
}
