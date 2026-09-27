import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';

/** タブ画面（SC-02／SC-06／SC-07）の枠：アプリバー＋内容＋下部タブ */
export function TabLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <AppHeader title={title} />
      {/* 下部タブ（64px）に内容が隠れないよう余白を取る */}
      <Box component="main" sx={{ pb: 11 }}>
        {children}
      </Box>
      <BottomNav />
    </>
  );
}
