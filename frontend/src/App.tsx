// ルーティングと認証ガード（詳細設計 7.4）
import Box from '@mui/material/Box';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { BrandDetailPage } from './pages/BrandDetailPage';
import { InventoryPage } from './pages/InventoryPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage, SummaryPage } from './pages/PlaceholderPages';

/**
 * ログインしていなければログイン画面（SC-01）へ移動する。
 * 自動ログインの試行中もログイン画面を表示し、成功したら元の画面に戻る
 * （Google 側で自動ログインできないことを検知できない場合があり、待たせないため）。
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status !== 'signedIn') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

/** ログアウトしたら、取得済みのデータを破棄する（別のアカウントでログインした場合に残さない） */
function ClearCacheOnSignOut() {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (status === 'signedOut') queryClient.clear();
  }, [status, queryClient]);
  return null;
}

const guarded = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={guarded(<InventoryPage />)} />
      <Route path="/brands/:brandId" element={guarded(<BrandDetailPage />)} />
      <Route path="/summary" element={guarded(<SummaryPage />)} />
      <Route path="/settings" element={guarded(<SettingsPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ClearCacheOnSignOut />
      {/* スマートフォン縦画面を基準に、最大480pxで中央寄せ（UI設計 1.1） */}
      <Box sx={{ maxWidth: 480, mx: 'auto', minHeight: '100vh' }}>
        <AppRoutes />
      </Box>
    </HashRouter>
  );
}
