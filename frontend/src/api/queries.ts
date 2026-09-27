// サーバーのデータの取得（詳細設計 7.3）。取得結果は TanStack Query がキャッシュして画面間で共有する
import type { GetAllData, StockHistory } from '@chaicoss/shared';
import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';

export const queryKeys = {
  all: ['all'] as const,
  histories: (brandId: string) => ['histories', brandId] as const,
};

/** ジャンル・色・銘柄・ロットの一括取得。30秒以内に再表示した場合は取得し直さない */
export function useAllData() {
  const callApi = useApi();
  return useQuery<GetAllData>({
    queryKey: queryKeys.all,
    queryFn: () => callApi('getAll', {}),
    staleTime: 30_000,
  });
}

/** 銘柄の在庫履歴（新しい順） */
export function useHistories(brandId: string) {
  const callApi = useApi();
  return useQuery<StockHistory[]>({
    queryKey: queryKeys.histories(brandId),
    queryFn: () => callApi('getHistories', { brandId }),
  });
}
