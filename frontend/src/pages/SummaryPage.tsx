// SC-06 ジャンル別集計（UI設計 2.6）
import type { GetAllData } from '@chaicoss/shared';
import { sumQty, summarizeByGenre } from '@chaicoss/shared';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAllData } from '../api/queries';
import { LoadError, Loading, SectionTitle } from '../components/QueryStatus';
import { TabLayout } from '../components/TabLayout';
import { formatQty } from '../format';

/** 茶葉の量（g の単位は呼び出し側で付ける） */
const grams = (qty: number) => formatQty(qty, 'LEAF').replace(/g$/, '');

function Stat({ value, unit, label }: { value: ReactNode; unit?: string; label: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{ flex: 1, px: 1.5, py: 1.25, borderRadius: '12px', borderColor: 'divider' }}
    >
      <Box sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
        {value}
        {unit && (
          <Box component="small" sx={{ fontSize: 13, fontWeight: 500, ml: '1px' }}>
            {unit}
          </Box>
        )}
      </Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</Box>
    </Paper>
  );
}

export function SummaryPage() {
  const { data, isPending, error, refetch } = useAllData();

  return (
    <TabLayout title="集計">
      {isPending ? (
        <Loading />
      ) : error ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : (
        <SummaryContent data={data} />
      )}
    </TabLayout>
  );
}

function SummaryContent({ data }: { data: GetAllData }) {
  const rows = summarizeByGenre(data.genres, data.brands, data.lots);
  const brandCount = rows.reduce((total, r) => total + r.brandCount, 0);
  const leafTotal = sumQty(rows.map((r) => r.leafQty));
  const bagTotal = sumQty(rows.map((r) => r.bagQty));
  // 茶葉の合計は、最大のジャンルを100%とするバーで比べる
  const maxLeaf = Math.max(...rows.map((r) => r.leafQty), 0);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, px: 2, pt: 1.5, pb: 0.5 }}>
        <Stat value={brandCount} label="在庫のある銘柄" />
        <Stat value={grams(leafTotal)} unit="g" label="茶葉の合計" />
        <Stat value={bagTotal} unit="個" label="ティーバッグの合計" />
      </Box>

      <SectionTitle>ジャンル別</SectionTitle>
      <Paper square elevation={0} sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        {rows.map(({ genre, brandCount: count, leafQty, bagQty }) => {
          const hasStock = count > 0;
          return (
            <ButtonBase
              key={genre.genreId}
              // タップすると、在庫一覧をこのジャンルだけで絞り込んで表示する（他の絞り込みは解除）
              component={Link}
              to={`/?genre=${encodeURIComponent(genre.genreId)}`}
              disabled={!hasStock}
              aria-disabled={!hasStock}
              sx={{
                width: '100%',
                display: 'flex',
                gap: 1.5,
                alignItems: 'center',
                justifyContent: 'flex-start',
                textAlign: 'left',
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
                '&:last-of-type': { borderBottom: 0 },
                opacity: hasStock ? 1 : 0.5,
              }}
            >
              <Box
                aria-hidden
                sx={{
                  flex: 'none',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  bgcolor: genre.color,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ fontWeight: 700 }}>{genre.name}</Box>
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {hasStock ? `${count}銘柄` : '在庫なし'}
                </Box>
                {leafQty > 0 && (
                  <Box
                    role="presentation"
                    sx={{
                      height: 6,
                      borderRadius: '3px',
                      bgcolor: 'background.default',
                      mt: 0.75,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${Math.round((leafQty / maxLeaf) * 100)}%`,
                        bgcolor: genre.color,
                      }}
                    />
                  </Box>
                )}
              </Box>
              <Box
                sx={{
                  flex: 'none',
                  textAlign: 'right',
                  fontSize: 12,
                  color: 'text.secondary',
                  lineHeight: 1.6,
                }}
              >
                {leafQty > 0 && (
                  <div>
                    茶葉{' '}
                    <Box component="b" sx={{ color: 'text.primary', fontSize: 15 }}>
                      {grams(leafQty)}
                    </Box>
                    g
                  </div>
                )}
                {bagQty > 0 && (
                  <div>
                    ティーバッグ{' '}
                    <Box component="b" sx={{ color: 'text.primary', fontSize: 15 }}>
                      {bagQty}
                    </Box>
                    個
                  </div>
                )}
              </Box>
            </ButtonBase>
          );
        })}
      </Paper>
    </>
  );
}
