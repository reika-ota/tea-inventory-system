import type { Form, IsoDate, Lot } from '@chaicoss/shared';
import MoreVert from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { AlertBadges } from '../../components/AlertBadges';
import { formatBestBefore, formatDate, formatQty } from '../../format';
import type { LotView } from './brandDetailView';

const rowSx = {
  px: 2,
  py: 1.5,
  display: 'flex',
  gap: 1.25,
  alignItems: 'flex-start',
  borderBottom: 1,
  borderColor: 'divider',
  '&:last-of-type': { borderBottom: 0 },
} as const;

function LotDates({ lot, today }: { lot: Lot; today: IsoDate }) {
  return (
    <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
      {formatBestBefore(lot.bestBefore, today)}
      <br />
      購入 {formatDate(lot.purchasedOn)}
    </Box>
  );
}

interface LotItemProps {
  view: LotView;
  form: Form;
  /** 残量バーの色（ジャンルの色） */
  color: string;
  today: IsoDate;
  /** 操作メニューを開く */
  onMenu(): void;
}

/** 有効ロットの行：残量／購入量、バッジ、残量バー、期限、購入日、操作メニュー */
export function LotItem({ view, form, color, today, onMenu }: LotItemProps) {
  const { lot } = view;
  return (
    <Box sx={rowSx}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
          <Box component="span" sx={{ fontSize: 18, fontWeight: 700 }}>
            {formatQty(lot.remainingQty, form)}
          </Box>
          <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
            ／{formatQty(lot.initialQty, form)}
          </Box>
          <AlertBadges alerts={view.alerts} next={view.isNext} />
        </Box>
        <Box
          role="presentation"
          sx={{
            height: 6,
            borderRadius: '3px',
            bgcolor: 'background.default',
            my: 0.75,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ height: '100%', width: `${Math.round(view.ratio * 100)}%`, bgcolor: color }} />
        </Box>
        <LotDates lot={lot} today={today} />
      </Box>
      <IconButton aria-label="ロットの操作" onClick={onMenu} sx={{ width: 44, height: 44 }}>
        <MoreVert />
      </IconButton>
    </Box>
  );
}

interface DepletedLotItemProps {
  lot: Lot;
  form: Form;
  today: IsoDate;
  /** 在庫の操作を実行中（ボタンを無効にする） */
  busy: boolean;
  onRestore(): void;
}

/** 使い切ったロットの行（「元に戻す」で使い切りを取り消す） */
export function DepletedLotItem({ lot, form, today, busy, onRestore }: DepletedLotItemProps) {
  return (
    <Box sx={rowSx}>
      <Box sx={{ flex: 1, minWidth: 0, opacity: 0.6 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Box component="span" sx={{ fontSize: 18, fontWeight: 700 }}>
            使い切り
          </Box>
          <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
            購入 {formatQty(lot.initialQty, form)}
          </Box>
        </Box>
        <LotDates lot={lot} today={today} />
      </Box>
      <Button
        variant="outlined"
        size="small"
        disabled={busy}
        onClick={onRestore}
        sx={{ flex: 'none', alignSelf: 'center' }}
      >
        元に戻す
      </Button>
    </Box>
  );
}
