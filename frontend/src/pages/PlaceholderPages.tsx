// SC-06 集計・SC-07 設定の仮画面（実装順序8で本来の画面に置き換える）
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useAuth } from '../auth/AuthContext';
import { TabLayout } from '../components/TabLayout';

const messageSx = { py: 10, px: 3, textAlign: 'center', color: 'text.secondary' } as const;

export function SummaryPage() {
  return (
    <TabLayout title="集計">
      <Box sx={messageSx}>集計画面は準備中です</Box>
    </TabLayout>
  );
}

export function SettingsPage() {
  const { email, signOut } = useAuth();
  return (
    <TabLayout title="設定">
      <Box sx={messageSx}>
        設定画面は準備中です
        <Box sx={{ mt: 4, fontSize: 14 }}>ログイン中：{email}</Box>
        <Button variant="outlined" sx={{ mt: 1 }} onClick={() => signOut()}>
          ログアウト
        </Button>
      </Box>
    </TabLayout>
  );
}
