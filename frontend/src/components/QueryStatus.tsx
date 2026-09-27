import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { ApiCallError } from '../api/client';

/** データの読み込み中 */
export function Loading({ label = '読み込んでいます' }: { label?: string }) {
  return (
    <Box sx={{ py: 10, display: 'grid', placeItems: 'center' }}>
      <CircularProgress aria-label={label} />
    </Box>
  );
}

/** データを取得できなかった場合の表示と再試行 */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiCallError ? error.message : 'エラーが発生しました';
  return (
    <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {message}
      </Typography>
      <Button variant="outlined" onClick={onRetry}>
        もう一度読み込む
      </Button>
    </Box>
  );
}

/** 一覧の見出し（UI設計のセクションタイトル） */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <Box
      component="h2"
      sx={{
        m: 0,
        px: 2,
        pt: 2.5,
        pb: 1,
        fontSize: 14,
        fontWeight: 700,
        color: 'text.secondary',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {children}
      {action}
    </Box>
  );
}
