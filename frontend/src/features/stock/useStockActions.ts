// SC-03 の在庫操作（飲んだ・使い切り・元に戻す）と、操作後の通知（UI設計 1.10・2.3）
import type { Form, IsoDate, Lot } from '@chaicoss/shared';
import { useState } from 'react';
import {
  useAdjustLot,
  useConsume,
  useDepleteLot,
  useRestoreLot,
  useUpdateLot,
} from '../../api/mutations';
import { useFeedback } from '../../feedback/FeedbackContext';
import { formatQty } from '../../format';

export interface DrinkInput {
  /** 指定しなければ引当ルールで選ぶ */
  lotId?: string;
  servings?: number;
  amount?: number;
}

export function useStockActions(brandId: string, form: Form | undefined) {
  const consume = useConsume();
  const deplete = useDepleteLot();
  const restore = useRestoreLot();
  const adjust = useAdjustLot();
  const update = useUpdateLot();
  const { notify } = useFeedback();
  // 飲んだ結果、残量が0になったロット（使い切りの確認ダイアログを出す）
  const [emptiedLot, setEmptiedLot] = useState<Lot | null>(null);

  const qty = (value: number) => formatQty(value, form ?? 'LEAF');

  const restoreLot = (lot: Lot) =>
    restore.mutate(
      { lotId: lot.lotId, version: lot.version },
      { onSuccess: () => notify('使い切りを取り消しました') },
    );

  const depleteLot = (lot: Lot, onDone?: () => void) =>
    deplete.mutate(
      { lotId: lot.lotId, version: lot.version },
      {
        onSuccess: (result) => {
          onDone?.();
          // 取り消しには、使い切りにした後のロット（版番号）を使う
          notify('使い切りにしました', {
            label: '元に戻す',
            onClick: () => restoreLot(result.lot),
          });
        },
      },
    );

  const drink = (input: DrinkInput) =>
    consume.mutate(
      { brandId, ...input },
      {
        onSuccess: (result) => {
          if (result.lot.remainingQty === 0) {
            setEmptiedLot(result.lot);
            return;
          }
          const used = qty(-result.history.delta);
          notify(
            input.amount === undefined
              ? `${input.servings ?? 1}杯飲みました（${used}）`
              : `${used}飲みました`,
          );
        },
      },
    );

  const adjustLot = (lot: Lot, remainingQty: number) =>
    adjust.mutate(
      { lotId: lot.lotId, version: lot.version, remainingQty },
      {
        onSuccess: (result) =>
          notify(result.history ? '残量を修正しました' : '残量は変わっていません'),
      },
    );

  const updateLotDates = (lot: Lot, dates: { bestBefore: IsoDate | null; purchasedOn: IsoDate }) =>
    update.mutate(
      { lotId: lot.lotId, version: lot.version, ...dates },
      { onSuccess: () => notify('保存しました') },
    );

  return {
    drink,
    adjustLot,
    updateLotDates,
    depleteLot,
    restoreLot,
    emptiedLot,
    closeEmptied: () => setEmptiedLot(null),
  };
}
