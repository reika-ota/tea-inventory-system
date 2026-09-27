import ArrowBack from '@mui/icons-material/ArrowBack';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface AppHeaderProps {
  title: string;
  /** 戻るボタンを表示する */
  back?: boolean;
  /** 右端の操作（その他メニューなど） */
  actions?: ReactNode;
}

/** 上部に固定表示するアプリバー（高さ56px、UI設計 1.1） */
export function AppHeader({ title, back = false, actions }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // 直接開いた場合など戻る先がないときは在庫一覧へ
  const goBack = () => {
    if (location.key === 'default') navigate('/');
    else navigate(-1);
  };

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar disableGutters sx={{ minHeight: 56, px: back ? 0.5 : 2, gap: 0.5 }}>
        {back && (
          <IconButton aria-label="戻る" onClick={goBack} sx={{ width: 44, height: 44 }}>
            <ArrowBack />
          </IconButton>
        )}
        <Typography component="h1" noWrap sx={{ flex: 1, fontSize: 20, fontWeight: 700 }}>
          {title}
        </Typography>
        {actions}
      </Toolbar>
    </AppBar>
  );
}
