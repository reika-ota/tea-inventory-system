// SC-07 設定（UI設計 2.7）
import type { GetAllData, Genre } from '@chaicoss/shared';
import { APP_NAME } from '@chaicoss/shared';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Add from '@mui/icons-material/Add';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Logout from '@mui/icons-material/Logout';
import MoreVert from '@mui/icons-material/MoreVert';
import Restore from '@mui/icons-material/Restore';
import Undo from '@mui/icons-material/Undo';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ApiCallError } from '../api/client';
import {
  useCreateGenre,
  useDeleteGenre,
  useRestoreBrand,
  useRestoreLot,
  useStockMutating,
  useUpdateGenre,
} from '../api/mutations';
import { useAllData } from '../api/queries';
import { useAuth } from '../auth/AuthContext';
import { BottomSheet } from '../components/BottomSheet';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadError, Loading, SectionTitle } from '../components/QueryStatus';
import { TabLayout } from '../components/TabLayout';
import { FALLBACK_COLOR } from '../features/inventory/BrandRow';
import type { GenreDialogValue } from '../features/settings/GenreDialog';
import { DUPLICATE_GENRE_NAME, GenreDialog } from '../features/settings/GenreDialog';
import {
  buildSettingsView,
  defaultGenreColor,
  genreMoves,
  nextSortOrder,
  sortGenres,
} from '../features/settings/settingsView';
import { useFeedback } from '../feedback/FeedbackContext';
import { formatDate, formatQty } from '../format';

const listSx = { borderTop: 1, borderBottom: 1, borderColor: 'divider' } as const;
const emptySx = { py: 3.5, textAlign: 'center', color: 'text.secondary', fontSize: 14 } as const;

/** 設定の1行：先頭の印、名前と補足、右端の操作 */
function SettingRow({
  lead,
  title,
  detail,
  action,
}: {
  lead: ReactNode;
  title: string;
  detail: string;
  action: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'center',
        pl: 2,
        pr: 1,
        py: 1.25,
        minHeight: 56,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      {lead}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </Box>
        <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{detail}</Box>
      </Box>
      {action}
    </Box>
  );
}

const Dot = ({ color }: { color: string }) => (
  <Box
    aria-hidden
    sx={{ flex: 'none', width: 14, height: 14, borderRadius: '50%', bgcolor: color }}
  />
);

export function SettingsPage() {
  const { data, isPending, error, refetch } = useAllData();
  return (
    <TabLayout title="設定">
      {isPending ? (
        <Loading />
      ) : error ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : (
        <SettingsContent data={data} />
      )}
    </TabLayout>
  );
}

function SettingsContent({ data }: { data: GetAllData }) {
  const { email, signOut } = useAuth();
  const { notify } = useFeedback();
  const createGenre = useCreateGenre();
  const updateGenre = useUpdateGenre();
  const deleteGenre = useDeleteGenre();
  const restoreBrand = useRestoreBrand();
  const restoreLot = useRestoreLot();
  const stockBusy = useStockMutating();

  const [menuGenre, setMenuGenre] = useState<Genre | null>(null);
  // ジャンルのダイアログ：追加は 'new'、編集は対象のジャンル
  const [editing, setEditing] = useState<Genre | 'new' | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [deletingGenre, setDeletingGenre] = useState<Genre | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const view = buildSettingsView(data);
  const sorted = sortGenres(data.genres);
  const menuIndex = menuGenre ? sorted.findIndex((g) => g.genreId === menuGenre.genreId) : -1;
  const menuRow = view.genres.find((r) => r.genre.genreId === menuGenre?.genreId);
  const editingGenre = editing === 'new' ? null : editing;

  const closeDialog = () => {
    setEditing(null);
    setDialogError(null);
  };

  /** 名前の重複はダイアログの中に表示する（他のエラーはスナックバー） */
  const onGenreError = (err: unknown) => {
    if (err instanceof ApiCallError && err.code === 'GENRE_NAME_DUPLICATE') {
      setDialogError(DUPLICATE_GENRE_NAME);
    }
  };

  const saveGenre = (value: GenreDialogValue) => {
    if (editing === 'new') {
      createGenre.mutate(
        { ...value, sortOrder: nextSortOrder(data.genres) },
        {
          onSuccess: () => {
            closeDialog();
            notify('ジャンルを追加しました');
          },
          onError: onGenreError,
        },
      );
    } else if (editing) {
      updateGenre.mutate(
        {
          genreId: editing.genreId,
          version: editing.version,
          sortOrder: editing.sortOrder,
          ...value,
        },
        {
          onSuccess: () => {
            closeDialog();
            notify('保存しました');
          },
          onError: onGenreError,
        },
      );
    }
  };

  /** 上へ・下へ移動：表示順が変わるジャンルを順に更新する */
  const moveGenre = async (index: number, direction: 'up' | 'down') => {
    for (const { genre, sortOrder } of genreMoves(sorted, index, direction)) {
      try {
        await updateGenre.mutateAsync({
          genreId: genre.genreId,
          version: genre.version,
          name: genre.name,
          color: genre.color,
          sortOrder,
        });
      } catch {
        // エラーは mutation 側で通知し、最新の並びを取り直している
        return;
      }
    }
  };

  const genrePending = createGenre.isPending || updateGenre.isPending || deleteGenre.isPending;

  return (
    <>
      {/* ジャンル */}
      <SectionTitle
        action={
          <Button
            size="small"
            startIcon={<Add fontSize="small" />}
            onClick={() => setEditing('new')}
          >
            追加
          </Button>
        }
      >
        ジャンル
      </SectionTitle>
      <Paper square elevation={0} sx={listSx}>
        {view.genres.map(({ genre, brandCount }) => (
          <SettingRow
            key={genre.genreId}
            lead={<Dot color={genre.color} />}
            title={genre.name}
            detail={`${brandCount}銘柄`}
            action={
              <IconButton
                aria-label={`${genre.name}の操作`}
                onClick={() => setMenuGenre(genre)}
                sx={{ width: 44, height: 44 }}
              >
                <MoreVert />
              </IconButton>
            }
          />
        ))}
      </Paper>

      {/* 削除した銘柄 */}
      <SectionTitle>削除した銘柄（{view.deletedBrands.length}）</SectionTitle>
      <Paper square elevation={0} sx={listSx}>
        {view.deletedBrands.length > 0 ? (
          view.deletedBrands.map(({ brand, genre }) => (
            <SettingRow
              key={brand.brandId}
              lead={<Dot color={genre?.color ?? FALLBACK_COLOR} />}
              title={brand.name}
              detail={`${genre?.name ?? ''}／削除 ${brand.deletedAt ? formatDate(brand.deletedAt.slice(0, 10)) : ''}`}
              action={
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Restore fontSize="small" />}
                  disabled={restoreBrand.isPending}
                  onClick={() =>
                    restoreBrand
                      .mutateAsync({ brandId: brand.brandId, version: brand.version })
                      .then(() => notify(`「${brand.name}」を復元しました`))
                      .catch(() => undefined)
                  }
                  sx={{ mr: 1, flex: 'none' }}
                >
                  復元
                </Button>
              }
            />
          ))
        ) : (
          <Box sx={emptySx}>削除した銘柄はありません</Box>
        )}
      </Paper>

      {/* 使い切ったロット（最近10件） */}
      <SectionTitle>使い切ったロット（最近10件）</SectionTitle>
      <Paper square elevation={0} sx={listSx}>
        {view.depletedLots.length > 0 ? (
          view.depletedLots.map(({ lot, brand, genre }) => (
            <SettingRow
              key={lot.lotId}
              lead={<Dot color={genre?.color ?? FALLBACK_COLOR} />}
              title={brand.name}
              detail={`購入 ${formatQty(lot.initialQty, brand.form)}／使い切り ${lot.depletedAt ? formatDate(lot.depletedAt.slice(0, 10)) : ''}`}
              action={
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Undo fontSize="small" />}
                  disabled={stockBusy}
                  onClick={() =>
                    restoreLot
                      .mutateAsync({ lotId: lot.lotId, version: lot.version })
                      .then(() => notify('使い切りを取り消しました'))
                      .catch(() => undefined)
                  }
                  sx={{ mr: 1, flex: 'none' }}
                >
                  元に戻す
                </Button>
              }
            />
          ))
        ) : (
          <Box sx={emptySx}>使い切ったロットはありません</Box>
        )}
      </Paper>

      {/* アカウント */}
      <SectionTitle>アカウント</SectionTitle>
      <Paper square elevation={0} sx={listSx}>
        <SettingRow
          lead={<AccountCircle sx={{ color: 'text.secondary' }} aria-hidden />}
          title={email ?? ''}
          detail="ログイン中"
          action={
            <Button
              size="small"
              startIcon={<Logout fontSize="small" />}
              onClick={() => setConfirmLogout(true)}
              sx={{ flex: 'none' }}
            >
              ログアウト
            </Button>
          }
        />
      </Paper>

      <Box sx={{ m: 2, fontSize: 12, color: 'text.secondary' }}>
        {APP_NAME} バージョン {__APP_VERSION__}
      </Box>

      {/* ジャンルの操作メニュー */}
      <BottomSheet
        open={menuGenre !== null}
        title={menuGenre?.name ?? ''}
        onClose={() => setMenuGenre(null)}
        items={
          menuGenre
            ? [
                { icon: <Edit />, label: '名前・色を変更', onClick: () => setEditing(menuGenre) },
                {
                  icon: <ArrowUpward />,
                  label: '上へ移動',
                  disabled: menuIndex <= 0 || genrePending,
                  onClick: () => void moveGenre(menuIndex, 'up'),
                },
                {
                  icon: <ArrowDownward />,
                  label: '下へ移動',
                  disabled: menuIndex >= sorted.length - 1 || genrePending,
                  onClick: () => void moveGenre(menuIndex, 'down'),
                },
                {
                  icon: <Delete />,
                  label: '削除',
                  danger: true,
                  disabled: menuRow?.inUse ?? true,
                  reason: 'このジャンルの銘柄があるため削除できません（削除した銘柄を含む）',
                  onClick: () => setDeletingGenre(menuGenre),
                },
              ]
            : []
        }
      />

      {/* ジャンルの追加・編集 */}
      <GenreDialog
        open={editing !== null}
        initial={editingGenre ? { name: editingGenre.name, color: editingGenre.color } : null}
        defaultColor={defaultGenreColor(data.colors, data.genres)}
        colors={data.colors}
        otherNames={data.genres
          .filter((g) => g.genreId !== editingGenre?.genreId)
          .map((g) => g.name)}
        serverError={dialogError}
        pending={genrePending}
        onCancel={closeDialog}
        onConfirm={saveGenre}
      />

      {/* ジャンルの削除の確認 */}
      <ConfirmDialog
        open={deletingGenre !== null}
        title="ジャンルを削除しますか？"
        message={`「${deletingGenre?.name ?? ''}」を削除します。`}
        cancelLabel="キャンセル"
        confirmLabel="削除する"
        danger
        onCancel={() => setDeletingGenre(null)}
        onConfirm={() => {
          const genre = deletingGenre;
          setDeletingGenre(null);
          if (genre) {
            deleteGenre.mutate(
              { genreId: genre.genreId, version: genre.version },
              { onSuccess: () => notify('ジャンルを削除しました') },
            );
          }
        }}
      />

      {/* ログアウトの確認 */}
      <ConfirmDialog
        open={confirmLogout}
        title="ログアウトしますか？"
        message="次に開いたときは、もう一度ログインが必要です。"
        cancelLabel="キャンセル"
        confirmLabel="ログアウト"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          signOut();
        }}
      />
    </>
  );
}
