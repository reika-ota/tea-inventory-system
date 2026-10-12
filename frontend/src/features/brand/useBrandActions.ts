// 銘柄の削除と、削除直後の「元に戻す」（UI設計 2.3）
import type { Brand } from '@chaicoss/shared';
import { useNavigate } from 'react-router-dom';
import { useDeleteBrand, useRestoreBrand } from '../../api/mutations';
import { useFeedback } from '../../feedback/FeedbackContext';

export function useBrandActions() {
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const remove = useDeleteBrand();
  const restore = useRestoreBrand();

  /**
   * 削除した銘柄を復元する（復元した旨を通知）。
   * 削除後に画面を移動してから「元に戻す」を押すこともあるため、画面が閉じても結果を受け取れる
   * mutateAsync を使う（エラーの通知は mutation 側で行う）
   */
  const restoreBrand = (brand: Brand) =>
    restore
      .mutateAsync({ brandId: brand.brandId, version: brand.version })
      .then(() => notify('復元しました'))
      .catch(() => undefined);

  /** 削除して在庫一覧に戻り、「元に戻す」付きで通知する */
  const deleteBrand = (brand: Brand) =>
    remove.mutate(
      { brandId: brand.brandId, version: brand.version },
      {
        onSuccess: (deleted) => {
          navigate('/', { replace: true });
          // 取り消しには、削除した後の銘柄（版番号）を使う
          notify('銘柄を削除しました', { label: '元に戻す', onClick: () => restoreBrand(deleted) });
        },
      },
    );

  return { deleteBrand, restoreBrand, pending: remove.isPending || restore.isPending };
}
