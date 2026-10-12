// 操作のフィードバック（UI設計 1.10）：スナックバーと、競合（VERSION_CONFLICT）のダイアログ
import { ERROR_MESSAGES } from '@chaicoss/shared';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiCallError } from '../api/client';
import { queryKeys } from '../api/queries';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { FeedbackContextValue, SnackbarAction } from './FeedbackContext';
import { FeedbackContext } from './FeedbackContext';

/** 下部タブがある画面（スナックバーをタブの上に出す） */
const TAB_PATHS = ['/', '/summary', '/settings'];

interface SnackState {
  /** 同じ文言が続いても表示し直すための番号 */
  key: number;
  message: string;
  action?: SnackbarAction;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const [snack, setSnack] = useState<SnackState | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);

  const notify = useCallback((message: string, action?: SnackbarAction) => {
    setSnack((prev) => ({ key: (prev?.key ?? 0) + 1, message, action }));
  }, []);

  const notifyError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiCallError && error.code === 'VERSION_CONFLICT') {
        // 他の人が先に更新した：最新のデータを取り直してから再操作してもらう
        setConflictOpen(true);
        void queryClient.invalidateQueries({ queryKey: queryKeys.all });
        return;
      }
      // 認証エラーはログイン画面で案内するため、ここでは通知しない
      if (error instanceof ApiCallError && error.code.startsWith('AUTH_')) return;
      notify(error instanceof ApiCallError ? error.message : ERROR_MESSAGES.INTERNAL_ERROR);
    },
    [notify, queryClient],
  );

  const value = useMemo<FeedbackContextValue>(
    () => ({ notify, notifyError }),
    [notify, notifyError],
  );
  const close = () => setSnack(null);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        key={snack?.key}
        open={snack !== null}
        onClose={(_e, reason) => reason !== 'clickaway' && close()}
        autoHideDuration={snack?.action ? 6000 : 3000}
        message={snack?.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ content: { sx: { bgcolor: '#27332b', color: '#fff', borderRadius: '10px' } } }}
        sx={{ bottom: TAB_PATHS.includes(pathname) ? '80px !important' : undefined }}
        action={
          snack?.action && (
            <Button
              size="small"
              sx={{ color: '#b9dcae', fontWeight: 700 }}
              onClick={() => {
                snack.action?.onClick();
                close();
              }}
            >
              {snack.action.label}
            </Button>
          )
        }
      />
      <ConfirmDialog
        open={conflictOpen}
        title="他の人が更新しました"
        message="最新の内容を読み込みました。内容を確認して、もう一度操作してください。"
        confirmLabel="OK"
        onConfirm={() => setConflictOpen(false)}
      />
    </FeedbackContext.Provider>
  );
}
