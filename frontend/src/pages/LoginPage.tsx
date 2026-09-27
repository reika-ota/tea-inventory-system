// SC-01 ログイン（UI設計 2.1）
import ErrorOutline from '@mui/icons-material/ErrorOutlineOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { APP_NAME } from '@chaicoss/shared';
import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TeaCup } from '../components/TeaCup';

const REASON_MESSAGES = {
  forbidden: 'このアカウントは利用できません。登録済みの家族のアカウントでログインしてください。',
  expired: 'ログインの有効期限が切れました。もう一度ログインしてください。',
} as const;

/** 認証ガードから渡される、ログイン後に戻る画面 */
function returnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && from !== '/login' ? from : '/';
}

export function LoginPage() {
  const { status, signOutReason, renderSignInButton } = useAuth();
  const location = useLocation();
  const buttonRef = useRef<HTMLDivElement>(null);
  const signedIn = status === 'signedIn';

  // Google 公式のログインボタンを表示する。
  // 自動ログインの試行中も表示しておき、自動ログインできない場合に待たせない
  useEffect(() => {
    if (signedIn || !buttonRef.current) return;
    return renderSignInButton(buttonRef.current);
  }, [signedIn, renderSignInButton]);

  if (signedIn) return <Navigate to={returnPath(location.state)} replace />;

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        maxWidth: 480,
        mx: 'auto',
        px: 3,
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1.25,
      }}
    >
      <TeaCup color="#9a3f1c" ratio={0.6} size="lg" />
      <Typography component="h1" sx={{ fontSize: 28, fontWeight: 700, mt: 1 }}>
        {APP_NAME}
      </Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
        家にあるお茶の残りと賞味期限を
        <br />
        家族で共有します
      </Typography>

      <Box sx={{ mt: 2, minHeight: 48, display: 'grid', placeItems: 'center' }}>
        <div ref={buttonRef} />
      </Box>

      {status === 'loading' && (
        <Box
          role="status"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.secondary',
            fontSize: 13,
          }}
        >
          <CircularProgress size={16} color="inherit" />
          自動でログインしています…
        </Box>
      )}

      {status === 'signedOut' && signOutReason && (
        <Alert
          severity="error"
          icon={<ErrorOutline fontSize="small" />}
          sx={{
            maxWidth: 320,
            mt: 1,
            textAlign: 'left',
            fontSize: 13,
            bgcolor: 'soft.expired',
            color: 'error.main',
          }}
        >
          {REASON_MESSAGES[signOutReason]}
        </Alert>
      )}

      <Typography sx={{ color: 'text.secondary', fontSize: 12, mt: 1.5 }}>
        登録済みの家族のアカウントのみ利用できます。
        <br />
        2回目以降は自動でログインします。
      </Typography>
    </Box>
  );
}
