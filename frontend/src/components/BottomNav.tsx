import BarChart from '@mui/icons-material/BarChart';
import EmojiFoodBeverage from '@mui/icons-material/EmojiFoodBeverage';
import Settings from '@mui/icons-material/Settings';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/', label: '在庫', icon: <EmojiFoodBeverage /> },
  { path: '/summary', label: '集計', icon: <BarChart /> },
  { path: '/settings', label: '設定', icon: <Settings /> },
] as const;

/** 下部タブ（在庫・集計・設定）。タブ画面（SC-02／SC-06／SC-07）だけに表示する */
export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <Paper
      component="nav"
      square
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        borderTop: 1,
        borderColor: 'divider',
        zIndex: 20,
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation value={pathname} showLabels sx={{ height: 64 }}>
        {TABS.map((tab) => (
          <BottomNavigationAction
            key={tab.path}
            value={tab.path}
            label={tab.label}
            icon={tab.icon}
            component={Link}
            to={tab.path}
            aria-current={pathname === tab.path ? 'page' : undefined}
            sx={{ '&.Mui-selected': { fontWeight: 700 } }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
