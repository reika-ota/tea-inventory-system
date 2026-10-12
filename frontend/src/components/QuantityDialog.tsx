// 数量の入力ダイアログ（量を指定して飲んだ・残量の修正。UI設計 1.10）
import type { Form } from '@chaicoss/shared';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { parseQuantity } from './quantityInput';

interface QuantityDialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** 入力欄の名前（単位は形態から付ける） */
  label: string;
  form: Form;
  /** 入力できる上限（例：ロットの残量） */
  max?: number;
  /** 0 を入力できるか（残量の修正） */
  allowZero?: boolean;
  initialValue?: number;
  confirmLabel: string;
  onConfirm(value: number): void;
  onCancel(): void;
}

export function QuantityDialog(props: QuantityDialogProps) {
  // 開くたびに入力欄を初期状態に戻すため、開いている間だけ中身を描画する
  return (
    <Dialog
      open={props.open}
      onClose={props.onCancel}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
    >
      {props.open && <QuantityForm {...props} />}
    </Dialog>
  );
}

function QuantityForm({
  title,
  description,
  label,
  form,
  max,
  allowZero,
  initialValue,
  confirmLabel,
  onConfirm,
  onCancel,
}: QuantityDialogProps) {
  const [text, setText] = useState(initialValue === undefined ? '' : String(initialValue));
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseQuantity(text, form, { max, allowZero });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    onConfirm(parsed.value);
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        {description && (
          <DialogContentText sx={{ fontSize: 14, mb: 1.5 }}>{description}</DialogContentText>
        )}
        <TextField
          autoFocus
          fullWidth
          label={`${label}（${form === 'BAG' ? '個' : 'g'}）`}
          type="number"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          error={error !== null}
          helperText={error ?? ' '}
          slotProps={{
            htmlInput: { inputMode: 'decimal', step: form === 'BAG' ? 1 : 0.1, min: 0 },
          }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>キャンセル</Button>
        <Button type="submit" variant="contained" disableElevation>
          {confirmLabel}
        </Button>
      </DialogActions>
    </form>
  );
}
