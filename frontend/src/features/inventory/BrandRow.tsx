import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { Link } from 'react-router-dom';
import { AlertBadges } from '../../components/AlertBadges';
import { TeaCup } from '../../components/TeaCup';
import { formatBestBeforeShort, formatQty } from '../../format';
import type { BrandSummary } from './inventoryView';

/** ジャンルが見つからない場合の色（灰茶色） */
export const FALLBACK_COLOR = '#8a7a6a';

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

/** SC-02 の銘柄の行（BrandCard）。タップで SC-03 へ */
export function BrandRow({ summary }: { summary: BrandSummary }) {
  const { brand, genre } = summary;
  const meta = [genre?.name, brand.flavors.join('、')].filter(Boolean).join('／');
  return (
    <ButtonBase
      component={Link}
      to={`/brands/${brand.brandId}`}
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
      }}
    >
      <TeaCup color={genre?.color ?? FALLBACK_COLOR} ratio={summary.fillRatio} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box data-name sx={{ fontWeight: 700, ...ellipsis }}>
          {brand.name}
        </Box>
        <Box sx={{ fontSize: 12, color: 'text.secondary', ...ellipsis }}>{meta}</Box>
        <AlertBadges alerts={summary.alerts} />
      </Box>
      <Box sx={{ flex: 'none', textAlign: 'right' }}>
        <Box sx={{ fontSize: 13, color: 'text.secondary' }}>
          あと
          <Box component="b" sx={{ fontSize: 22, color: 'text.primary', mx: 0.25 }}>
            {summary.servings}
          </Box>
          杯
        </Box>
        <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
          {formatQty(summary.totalQty, brand.form)}
        </Box>
        <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
          {formatBestBeforeShort(summary.nearestBestBefore)}
        </Box>
      </Box>
    </ButtonBase>
  );
}

/** 在庫なし枠の行。タップで SC-03 へ（再購入ボタンは実装順序8で追加する） */
export function NoStockRow({ summary }: { summary: BrandSummary }) {
  const { brand, genre } = summary;
  return (
    <ButtonBase
      component={Link}
      to={`/brands/${brand.brandId}`}
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
      }}
    >
      <TeaCup color={genre?.color ?? FALLBACK_COLOR} ratio={0} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ fontWeight: 700, ...ellipsis }}>{brand.name}</Box>
        <Box sx={{ fontSize: 12, color: 'text.secondary', ...ellipsis }}>{genre?.name}</Box>
      </Box>
    </ButtonBase>
  );
}
