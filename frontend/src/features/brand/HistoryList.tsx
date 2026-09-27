import type { Form } from '@chaicoss/shared';
import { displayUserName } from '@chaicoss/shared';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import { ApiCallError } from '../../api/client';
import { useHistories } from '../../api/queries';
import { formatDate, formatDelta, formatQty, historyLabel } from '../../format';

/** 表示する履歴の件数（新しい順） */
const HISTORY_LIMIT = 10;

const boxSx = { borderTop: 1, borderBottom: 1, borderColor: 'divider' } as const;
const messageSx = { py: 3, textAlign: 'center', color: 'text.secondary', fontSize: 14 } as const;

/** 在庫履歴：区分（杯数）、日付、操作者、増減量、操作後の残量（UI設計 2.3） */
export function HistoryList({ brandId, form }: { brandId: string; form: Form }) {
  const { data, isPending, error } = useHistories(brandId);

  if (isPending) {
    return (
      <Paper square elevation={0} sx={{ ...boxSx, ...messageSx }}>
        <CircularProgress size={24} aria-label="履歴を読み込んでいます" />
      </Paper>
    );
  }
  if (error) {
    return (
      <Paper square elevation={0} sx={{ ...boxSx, ...messageSx }}>
        {error instanceof ApiCallError ? error.message : '履歴を読み込めませんでした'}
      </Paper>
    );
  }
  if (data.length === 0) {
    return (
      <Paper square elevation={0} sx={{ ...boxSx, ...messageSx }}>
        履歴はありません
      </Paper>
    );
  }

  return (
    <Paper component="ul" square elevation={0} sx={{ ...boxSx, m: 0, p: 0, listStyle: 'none' }}>
      {data.slice(0, HISTORY_LIMIT).map((h) => (
        <Box
          component="li"
          key={h.historyId}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1,
            px: 2,
            py: 1.25,
            fontSize: 13,
            borderBottom: 1,
            borderColor: 'divider',
            '&:last-of-type': { borderBottom: 0 },
          }}
        >
          <div>
            <div>{historyLabel(h)}</div>
            <Box sx={{ color: 'text.secondary', fontSize: 12 }}>
              {formatDate(h.occurredAt.slice(0, 10))}
              {'　'}
              {displayUserName(h.userEmail)}
            </Box>
          </div>
          <Box
            sx={{
              fontWeight: 700,
              textAlign: 'right',
              whiteSpace: 'nowrap',
              color: h.delta >= 0 ? 'primary.main' : 'text.primary',
            }}
          >
            {formatDelta(h.delta, form)}
            <Box sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 400 }}>
              残 {formatQty(h.qtyAfter, form)}
            </Box>
          </Box>
        </Box>
      ))}
    </Paper>
  );
}
