// 操作メニュー（UI設計 1.10）：画面下から出るシート。実行できない項目は無効にして理由を併記する
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Drawer from '@mui/material/Drawer';
import type { ReactNode } from 'react';

export interface SheetItem {
  icon: ReactNode;
  label: string;
  onClick(): void;
  /** 削除・使い切りなど（文字とアイコンを削除色にする） */
  danger?: boolean;
  disabled?: boolean;
  /** 無効にした理由 */
  reason?: string;
}

interface BottomSheetProps {
  open: boolean;
  title: string;
  items: readonly SheetItem[];
  onClose(): void;
}

export function BottomSheet({ open, title, items, onClose }: BottomSheetProps) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            maxWidth: 480,
            mx: 'auto',
            borderRadius: '16px 16px 0 0',
            pt: 1,
            pb: 'calc(12px + env(safe-area-inset-bottom))',
          },
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 36,
          height: 4,
          borderRadius: 2,
          bgcolor: 'divider',
          mx: 'auto',
          mt: 0.5,
          mb: 1,
        }}
      />
      <Box
        component="h3"
        sx={{
          m: 0,
          fontSize: 14,
          color: 'text.secondary',
          fontWeight: 500,
          px: 2.5,
          pt: 0.5,
          pb: 1,
        }}
      >
        {title}
      </Box>
      <Box role="menu" aria-label={title}>
        {items.map((item) => (
          <ButtonBase
            key={item.label}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onClick();
            }}
            sx={{
              width: '100%',
              justifyContent: 'flex-start',
              textAlign: 'left',
              gap: 2,
              px: 2.5,
              py: 1.75,
              fontSize: 15,
              color: item.disabled ? 'text.secondary' : item.danger ? 'error.main' : 'text.primary',
              '& .MuiSvgIcon-root': { color: item.danger ? 'error.main' : 'text.secondary' },
            }}
          >
            {item.icon}
            <span>
              {item.label}
              {item.disabled && item.reason && (
                <Box
                  component="span"
                  sx={{ display: 'block', fontSize: 12, color: 'text.secondary' }}
                >
                  {item.reason}
                </Box>
              )}
            </span>
          </ButtonBase>
        ))}
      </Box>
    </Drawer>
  );
}
