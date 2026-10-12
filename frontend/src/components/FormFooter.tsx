import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

/** 入力フォーム画面（SC-04／SC-05）の、画面下部に固定する確定ボタン（UI設計 1.1） */
interface FormFooterProps {
  label: string;
  /** 送信中に表示する文言 */
  pendingLabel?: string;
  pending: boolean;
}

export function FormFooter({ label, pendingLabel = '登録しています…', pending }: FormFooterProps) {
  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        bgcolor: 'background.default',
        px: 2,
        pt: 1.5,
        pb: 'calc(12px + env(safe-area-inset-bottom))',
        borderTop: 1,
        borderColor: 'divider',
        mt: 2,
      }}
    >
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disableElevation
        disabled={pending}
        sx={{ height: 48 }}
      >
        {pending ? pendingLabel : label}
      </Button>
    </Box>
  );
}
