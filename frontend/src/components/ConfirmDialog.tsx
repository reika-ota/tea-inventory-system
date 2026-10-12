import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** 省略すると確定ボタンだけを表示する（お知らせ用） */
  cancelLabel?: string;
  /** 削除など取り消しにくい操作は、確定ボタンを削除色にする */
  danger?: boolean;
  onConfirm(): void;
  onCancel?(): void;
}

/** 確認ダイアログ（使い切り確認・削除確認など。UI設計 1.10） */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel ?? onConfirm}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
    >
      <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: 14 }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        {cancelLabel && <Button onClick={onCancel}>{cancelLabel}</Button>}
        <Button
          variant="contained"
          color={danger ? 'error' : 'primary'}
          disableElevation
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
