// SC-02 在庫一覧（UI設計 2.2）
import type { AlertKind, Form } from '@chaicoss/shared';
import { toJstDate } from '@chaicoss/shared';
import Search from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import InputBase from '@mui/material/InputBase';
import NativeSelect from '@mui/material/NativeSelect';
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useSearchParams } from 'react-router-dom';
import { useAllData } from '../api/queries';
import { ALERT_COLORS, ALERT_LABELS } from '../components/alertStyles';
import { LoadError, Loading, SectionTitle } from '../components/QueryStatus';
import { TabLayout } from '../components/TabLayout';
import { BrandRow, NoStockRow } from '../features/inventory/BrandRow';
import type { FormFilter, InventoryFilters, SortKey } from '../features/inventory/inventoryView';
import {
  ALERT_KINDS,
  DEFAULT_FILTERS,
  SORT_OPTIONS,
  buildInventoryView,
  filtersFromParams,
  filtersToParams,
} from '../features/inventory/inventoryView';
import { FORM_LABELS } from '../format';

const FORM_OPTIONS: readonly { value: FormFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  ...(['LEAF', 'BAG'] as const).map((form: Form) => ({ value: form, label: FORM_LABELS[form] })),
];

export function InventoryPage() {
  const { data, isPending, error, refetch } = useAllData();
  // 絞り込みの状態は URL に持たせる（詳細画面から戻ったときや SC-06 からの遷移で保つため）
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);
  const today = toJstDate(new Date());

  // 銘柄は数十件程度のため、描画のたびに組み立て直す
  const view = data ? buildInventoryView(data, filters, today) : null;

  const update = (patch: Partial<InventoryFilters>) =>
    setParams(filtersToParams({ ...filters, ...patch }), { replace: true });

  const toggleAlert = (kind: AlertKind) => update({ alert: filters.alert === kind ? null : kind });

  return (
    <TabLayout title="在庫">
      {isPending ? (
        <Loading />
      ) : error || !view ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          {/* 注意の件数（タップで絞り込み、もう一度タップで解除） */}
          <Box sx={{ display: 'flex', gap: 1, px: 2, pt: 1.5, pb: 0.5 }}>
            {ALERT_KINDS.map((kind) => (
              <ButtonBase
                key={kind}
                aria-pressed={filters.alert === kind}
                onClick={() => toggleAlert(kind)}
                sx={{
                  flex: 1,
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  borderRadius: '10px',
                  px: 0.75,
                  py: 1,
                  border: '1.5px solid',
                  borderColor: filters.alert === kind ? 'currentColor' : 'transparent',
                  ...ALERT_COLORS[kind],
                }}
              >
                <Box component="span" sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
                  {view.alertCounts[kind]}
                </Box>
                <Box component="span" sx={{ fontSize: 12 }}>
                  {ALERT_LABELS[kind]}
                </Box>
              </ButtonBase>
            ))}
          </Box>

          {/* 検索（銘柄名・フレーバーの部分一致） */}
          <Paper
            variant="outlined"
            sx={{
              mx: 2,
              mt: 1,
              px: 1.5,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Search sx={{ color: 'text.secondary' }} aria-hidden />
            <InputBase
              type="search"
              placeholder="銘柄名・フレーバーで探す"
              value={filters.q}
              onChange={(e) => update({ q: e.target.value })}
              inputProps={{ 'aria-label': '銘柄名・フレーバーで探す' }}
              sx={{ flex: 1 }}
            />
          </Paper>

          {/* ジャンルチップ（横スクロール） */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              px: 2,
              pt: 1.25,
              pb: 0.25,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            <GenreChip
              label={`すべて ${view.stockCount}`}
              selected={filters.genreId === null}
              onClick={() => update({ genreId: null })}
            />
            {view.genreChips.map(({ genre, count }) => (
              <GenreChip
                key={genre.genreId}
                label={`${genre.name} ${count}`}
                color={genre.color}
                selected={filters.genreId === genre.genreId}
                onClick={() => update({ genreId: genre.genreId })}
              />
            ))}
          </Box>

          {/* 形態の切り替えと並び替え */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 2,
              pt: 1.25,
              pb: 0.75,
            }}
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              aria-label="形態"
              value={filters.form}
              onChange={(_e, value: FormFilter | null) => value && update({ form: value })}
              sx={{ bgcolor: 'background.paper' }}
            >
              {FORM_OPTIONS.map((option) => (
                <ToggleButton
                  key={option.value}
                  value={option.value}
                  sx={{
                    py: 0.5,
                    px: 1.25,
                    fontSize: 13,
                    '&.Mui-selected': {
                      bgcolor: 'soft.primary',
                      color: 'primary.main',
                      fontWeight: 700,
                    },
                  }}
                >
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <NativeSelect
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })} // 選択肢は SORT_OPTIONS のみ
              inputProps={{ 'aria-label': '並び替え' }}
              disableUnderline
              sx={{
                fontSize: 13,
                border: 1,
                borderColor: 'divider',
                borderRadius: '8px',
                bgcolor: 'background.paper',
                px: 1,
                '& select': { fontSize: 13, py: 0.5 },
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </Box>

          <Box sx={{ fontSize: 12, color: 'text.secondary', px: 2, pb: 0.75 }}>
            {view.rows.length}銘柄を表示
          </Box>

          <Paper
            square
            elevation={0}
            sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider' }}
          >
            {view.rows.length > 0 ? (
              view.rows.map((summary) => <BrandRow key={summary.brand.brandId} summary={summary} />)
            ) : (
              <Box
                sx={{ py: 3.5, px: 2, textAlign: 'center', color: 'text.secondary', fontSize: 14 }}
              >
                条件に合う銘柄はありません
                <Box>
                  <Button
                    onClick={() =>
                      setParams(filtersToParams({ ...DEFAULT_FILTERS, sort: filters.sort }), {
                        replace: true,
                      })
                    }
                  >
                    絞り込みを解除
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>

          <SectionTitle>在庫なし（{view.noStock.length}）</SectionTitle>
          <Paper
            square
            elevation={0}
            sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider' }}
          >
            {view.noStock.length > 0 ? (
              view.noStock.map((summary) => (
                <NoStockRow key={summary.brand.brandId} summary={summary} />
              ))
            ) : (
              <Box sx={{ py: 3.5, textAlign: 'center', color: 'text.secondary', fontSize: 14 }}>
                在庫なしの銘柄はありません
              </Box>
            )}
          </Paper>
        </>
      )}
    </TabLayout>
  );
}

interface GenreChipProps {
  label: string;
  /** ジャンルの色の点（「すべて」は点なし） */
  color?: string;
  selected: boolean;
  onClick: () => void;
}

function GenreChip({ label, color, selected, onClick }: GenreChipProps) {
  return (
    <ButtonBase
      aria-pressed={selected}
      onClick={onClick}
      sx={{
        flex: 'none',
        gap: 0.75,
        height: 32,
        px: 1.5,
        borderRadius: '16px',
        border: 1,
        fontSize: 13,
        whiteSpace: 'nowrap',
        ...(selected
          ? { bgcolor: 'text.primary', color: '#fff', borderColor: 'text.primary' }
          : { bgcolor: 'background.paper', borderColor: 'divider' }),
      }}
    >
      {color && (
        <Box
          component="span"
          aria-hidden
          sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }}
        />
      )}
      {label}
    </ButtonBase>
  );
}
