// SC-03 銘柄詳細（UI設計 2.3）
import type { Lot } from '@chaicoss/shared';
import { toJstDate } from '@chaicoss/shared';
import AddShoppingCart from '@mui/icons-material/AddShoppingCart';
import Delete from '@mui/icons-material/Delete';
import DoneAll from '@mui/icons-material/DoneAll';
import Edit from '@mui/icons-material/Edit';
import Event from '@mui/icons-material/Event';
import LocalCafe from '@mui/icons-material/LocalCafe';
import MoreVert from '@mui/icons-material/MoreVert';
import Tune from '@mui/icons-material/Tune';
import ChevronRight from '@mui/icons-material/ChevronRight';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStockMutating } from '../api/mutations';
import { useAllData } from '../api/queries';
import { AlertBadges } from '../components/AlertBadges';
import { AppHeader } from '../components/AppHeader';
import { BottomSheet } from '../components/BottomSheet';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { QuantityDialog } from '../components/QuantityDialog';
import { LoadError, Loading, SectionTitle } from '../components/QueryStatus';
import { TeaCup } from '../components/TeaCup';
import { HistoryList } from '../features/brand/HistoryList';
import { DepletedLotItem, LotItem } from '../features/brand/LotItem';
import { buildBrandDetailView } from '../features/brand/brandDetailView';
import { useBrandActions } from '../features/brand/useBrandActions';
import { FALLBACK_COLOR } from '../features/inventory/BrandRow';
import type { ConsumeTarget } from '../features/stock/ConsumePanel';
import { ConsumePanel } from '../features/stock/ConsumePanel';
import { LotDatesDialog } from '../features/stock/LotDatesDialog';
import { useStockActions } from '../features/stock/useStockActions';
import { FORM_LABELS, formatBestBeforeShort, formatQty } from '../format';

const listSx = { borderTop: 1, borderBottom: 1, borderColor: 'divider' } as const;

export function BrandDetailPage() {
  const { brandId = '' } = useParams();
  const { data, isPending, error, refetch } = useAllData();
  // 使い切ったロットの一覧は、初めは閉じておく
  const [showDepleted, setShowDepleted] = useState(false);
  // 「このロットから飲む」で指定したロット
  const [pinnedLotId, setPinnedLotId] = useState<string | null>(null);
  // 操作メニューを開いているロット、使い切りの確認をしているロット、量の指定ダイアログ
  const [menuLot, setMenuLot] = useState<Lot | null>(null);
  const [depletingLot, setDepletingLot] = useState<Lot | null>(null);
  const [amountOpen, setAmountOpen] = useState(false);
  const [adjustingLot, setAdjustingLot] = useState<Lot | null>(null);
  const [datingLot, setDatingLot] = useState<Lot | null>(null);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();
  const brandActions = useBrandActions();
  const busy = useStockMutating();
  const form = data?.brands.find((b) => b.brandId === brandId)?.form;
  const actions = useStockActions(brandId, form);
  const today = toJstDate(new Date());

  if (isPending) {
    return (
      <>
        <AppHeader title="" back />
        <Loading />
      </>
    );
  }
  if (error) {
    return (
      <>
        <AppHeader title="" back />
        <LoadError error={error} onRetry={() => void refetch()} />
      </>
    );
  }

  const view = buildBrandDetailView(data, brandId, today);
  if (!view) {
    return (
      <>
        <AppHeader title="" back />
        <Box sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
          銘柄が見つかりません
        </Box>
      </>
    );
  }

  const { brand, genre } = view;
  const color = genre?.color ?? FALLBACK_COLOR;
  const qty = (value: number) => formatQty(value, brand.form);

  // 消費の対象：指定したロット（使い切りになっていなければ）、なければ引当ルールで次に使うロット
  const pinned = view.activeLots.find((v) => v.lot.lotId === pinnedLotId)?.lot;
  const next = view.activeLots.find((v) => v.isNext)?.lot;
  const target: ConsumeTarget | null = pinned
    ? { lot: pinned, pinned: true }
    : next
      ? { lot: next, pinned: false }
      : null;
  const unpinIf = (lot: Lot) => () => {
    if (lot.lotId === pinnedLotId) setPinnedLotId(null);
  };

  return (
    <>
      <AppHeader
        title={brand.name}
        back
        actions={
          <IconButton
            aria-label="その他の操作"
            onClick={() => setBrandMenuOpen(true)}
            sx={{ width: 44, height: 44 }}
          >
            <MoreVert />
          </IconButton>
        }
      />
      <Box component="main" sx={{ pb: 3 }}>
        {/* 概要 */}
        <Paper
          square
          elevation={0}
          sx={{
            p: 2,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <TeaCup color={color} ratio={view.fillRatio} size="lg" />
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ fontSize: 13, color: 'text.secondary' }}>
              {genre?.name}／{FORM_LABELS[brand.form]}／1杯 {qty(brand.servingAmount)}
            </Box>
            {brand.flavors.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                {brand.flavors.map((flavor) => (
                  <Box
                    key={flavor}
                    component="span"
                    sx={{
                      fontSize: 12,
                      px: 1,
                      py: '1px',
                      borderRadius: '10px',
                      border: 1,
                      borderColor: 'divider',
                      color: 'text.secondary',
                    }}
                  >
                    {flavor}
                  </Box>
                ))}
              </Box>
            )}
            <Box sx={{ mt: 0.75, fontSize: 13, color: 'text.secondary' }}>
              合計{' '}
              <Box component="b" sx={{ fontSize: 18, color: 'text.primary' }}>
                {qty(view.totalQty)}
              </Box>
              {'　'}あと{view.servings}杯
            </Box>
            <AlertBadges alerts={view.alerts} />
          </Box>
        </Paper>

        {/* 消費パネル */}
        <ConsumePanel
          brand={brand}
          target={target}
          busy={busy}
          onDrink={(servings) =>
            actions.drink({ servings, ...(target?.pinned && { lotId: target.lot.lotId }) })
          }
          onAmount={() => setAmountOpen(true)}
          onUseAll={() => target && actions.depleteLot(target.lot, unpinIf(target.lot))}
          onUnpin={() => setPinnedLotId(null)}
        />

        {/* ロット */}
        <SectionTitle
          action={
            <Button
              size="small"
              component={Link}
              to={`/brands/${brand.brandId}/purchase`}
              startIcon={<AddShoppingCart fontSize="small" />}
            >
              買い足し
            </Button>
          }
        >
          ロット（{view.activeLots.length}）
        </SectionTitle>
        <Paper square elevation={0} sx={listSx}>
          {view.activeLots.length > 0 ? (
            view.activeLots.map((lotView) => (
              <LotItem
                key={lotView.lot.lotId}
                view={lotView}
                form={brand.form}
                color={color}
                today={today}
                onMenu={() => setMenuLot(lotView.lot)}
              />
            ))
          ) : (
            <Box sx={{ py: 3.5, textAlign: 'center', color: 'text.secondary', fontSize: 14 }}>
              有効なロットはありません
            </Box>
          )}
        </Paper>

        {/* 使い切ったロット（折りたたみ） */}
        {view.depletedLots.length > 0 && (
          <>
            <SectionTitle>
              <Button
                size="small"
                aria-expanded={showDepleted}
                startIcon={showDepleted ? <ExpandMore /> : <ChevronRight />}
                onClick={() => setShowDepleted((v) => !v)}
                sx={{ p: 0, fontSize: 14 }}
              >
                使い切ったロット（{view.depletedLots.length}）
              </Button>
            </SectionTitle>
            {showDepleted && (
              <Paper square elevation={0} sx={listSx}>
                {view.depletedLots.map((lot) => (
                  <DepletedLotItem
                    key={lot.lotId}
                    lot={lot}
                    form={brand.form}
                    today={today}
                    busy={busy}
                    onRestore={() => actions.restoreLot(lot)}
                  />
                ))}
              </Paper>
            )}
          </>
        )}

        {/* 情報 */}
        <SectionTitle
          action={
            <Button
              size="small"
              component={Link}
              to={`/brands/${brand.brandId}/edit`}
              startIcon={<Edit fontSize="small" />}
            >
              編集
            </Button>
          }
        >
          情報
        </SectionTitle>
        <Paper component="dl" square elevation={0} sx={{ ...listSx, m: 0, px: 2, py: 0.5 }}>
          {[
            ['ジャンル', genre?.name ?? '—'],
            ['フレーバー', brand.flavors.join('、') || '—'],
            ['形態', FORM_LABELS[brand.form]],
            ['1杯の量', qty(brand.servingAmount)],
            ['購入店', brand.shop ?? '—'],
            ['メモ', brand.memo ?? '—'],
          ].map(([label, value]) => (
            <Box
              key={label}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
                py: 1.25,
                fontSize: 14,
                borderBottom: 1,
                borderColor: 'divider',
                '&:last-of-type': { borderBottom: 0 },
              }}
            >
              <Box component="dt" sx={{ color: 'text.secondary', flex: 'none' }}>
                {label}
              </Box>
              <Box
                component="dd"
                sx={{ m: 0, textAlign: 'right', maxWidth: '65%', whiteSpace: 'pre-wrap' }}
              >
                {value}
              </Box>
            </Box>
          ))}
        </Paper>

        {/* 履歴 */}
        <SectionTitle>履歴</SectionTitle>
        <HistoryList brandId={brand.brandId} form={brand.form} />
      </Box>

      {/* 銘柄の操作メニュー */}
      <BottomSheet
        open={brandMenuOpen}
        title={brand.name}
        onClose={() => setBrandMenuOpen(false)}
        items={[
          {
            icon: <Edit />,
            label: '銘柄を編集',
            onClick: () => navigate(`/brands/${brand.brandId}/edit`),
          },
          {
            icon: <Delete />,
            label: '銘柄を削除',
            danger: true,
            disabled: view.activeLots.length > 0,
            reason: '在庫が残っているため削除できません',
            onClick: () => setConfirmDelete(true),
          },
        ]}
      />

      {/* 銘柄の削除の確認 */}
      <ConfirmDialog
        open={confirmDelete}
        title="銘柄を削除しますか？"
        message={`「${brand.name}」を一覧から外します。設定の「削除した銘柄」から復元できます。`}
        cancelLabel="キャンセル"
        confirmLabel="削除する"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          brandActions.deleteBrand(brand);
        }}
      />

      {/* ロットの操作メニュー */}
      <BottomSheet
        open={menuLot !== null}
        title={
          menuLot
            ? `ロット（${qty(menuLot.remainingQty)}／${formatBestBeforeShort(menuLot.bestBefore)}）`
            : ''
        }
        onClose={() => setMenuLot(null)}
        items={
          menuLot
            ? [
                {
                  icon: <LocalCafe />,
                  label: 'このロットから飲む',
                  disabled: menuLot.lotId === pinnedLotId,
                  reason: '指定済みです',
                  onClick: () => {
                    setPinnedLotId(menuLot.lotId);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  },
                },
                {
                  icon: <Tune />,
                  label: '残量を修正',
                  disabled: busy,
                  onClick: () => setAdjustingLot(menuLot),
                },
                {
                  icon: <Event />,
                  label: '賞味期限・購入日を修正',
                  onClick: () => setDatingLot(menuLot),
                },
                {
                  icon: <DoneAll />,
                  label: '使い切りにする',
                  danger: true,
                  disabled: busy,
                  onClick: () => setDepletingLot(menuLot),
                },
              ]
            : []
        }
      />

      {/* 量を指定して飲んだ */}
      <QuantityDialog
        open={amountOpen && target !== null}
        title="量を指定して飲んだ"
        description="ブレンドなどで1杯分と違う量を使ったときに使います。"
        label="使った量"
        form={brand.form}
        max={target?.lot.remainingQty}
        confirmLabel="飲んだ"
        onCancel={() => setAmountOpen(false)}
        onConfirm={(amount) => {
          setAmountOpen(false);
          actions.drink({ amount, ...(target?.pinned && { lotId: target.lot.lotId }) });
        }}
      />

      {/* 残量を修正 */}
      <QuantityDialog
        open={adjustingLot !== null}
        title="残量を修正"
        description="計量した実際の残量を入力します。"
        label="残量"
        form={brand.form}
        allowZero
        initialValue={adjustingLot?.remainingQty}
        confirmLabel="保存"
        onCancel={() => setAdjustingLot(null)}
        onConfirm={(remainingQty) => {
          if (adjustingLot) actions.adjustLot(adjustingLot, remainingQty);
          setAdjustingLot(null);
        }}
      />

      {/* 賞味期限・購入日を修正 */}
      <LotDatesDialog
        lot={datingLot}
        today={today}
        onCancel={() => setDatingLot(null)}
        onConfirm={(dates) => {
          if (datingLot) actions.updateLotDates(datingLot, dates);
          setDatingLot(null);
        }}
      />

      {/* 使い切りの確認（ロットの操作メニューから） */}
      <ConfirmDialog
        open={depletingLot !== null}
        title="使い切りにしますか？"
        message={
          depletingLot ? `残り${qty(depletingLot.remainingQty)}を使い切りとして記録します。` : ''
        }
        cancelLabel="キャンセル"
        confirmLabel="使い切りにする"
        onCancel={() => setDepletingLot(null)}
        onConfirm={() => {
          if (depletingLot) actions.depleteLot(depletingLot, unpinIf(depletingLot));
          setDepletingLot(null);
        }}
      />

      {/* 飲んだ結果、残量が0になった場合の確認 */}
      <ConfirmDialog
        open={actions.emptiedLot !== null}
        title="使い切りにしますか？"
        message="このロットの残量が0になりました。使い切りにすると一覧から外れます。"
        cancelLabel="あとで"
        confirmLabel="使い切りにする"
        onCancel={actions.closeEmptied}
        onConfirm={() => {
          const lot = actions.emptiedLot;
          actions.closeEmptied();
          if (lot) actions.depleteLot(lot, unpinIf(lot));
        }}
      />
    </>
  );
}
