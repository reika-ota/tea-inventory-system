// ジャンルの追加・名前と色の変更ダイアログ（UI設計 2.7）
import type { ColorOption } from '@chaicoss/shared';
import { LIMITS, checkRequiredText } from '@chaicoss/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import type { FormEvent } from 'react';
import { useState } from 'react';

export interface GenreDialogValue {
  name: string;
  color: string;
}

interface GenreDialogProps {
  open: boolean;
  /** 編集の場合は今の値。追加の場合は null */
  initial: GenreDialogValue | null;
  /** 追加の場合の初期の色（まだ使われていない色） */
  defaultColor: string | null;
  colors: readonly ColorOption[];
  /** 他のジャンルの名前（重複の確認に使う） */
  otherNames: readonly string[];
  /** サーバーで名前が重複した場合などのエラー */
  serverError?: string | null;
  pending: boolean;
  onConfirm(value: GenreDialogValue): void;
  onCancel(): void;
}

export const DUPLICATE_GENRE_NAME = '同じ名前のジャンルがあります';

export function GenreDialog(props: GenreDialogProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onCancel}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
    >
      {props.open && <GenreForm {...props} />}
    </Dialog>
  );
}

function GenreForm({
  initial,
  defaultColor,
  colors,
  otherNames,
  serverError,
  pending,
  onConfirm,
  onCancel,
}: GenreDialogProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? defaultColor ?? '');
  const [error, setError] = useState<string | null>(null);
  const sortedColors = [...colors].sort((a, b) => a.sortOrder - b.sortOrder);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const checked = checkRequiredText(name, LIMITS.genreNameMax);
    if (!checked.ok) return setError(checked.error);
    if (otherNames.includes(checked.value)) return setError(DUPLICATE_GENRE_NAME);
    onConfirm({ name: checked.value, color });
  };

  const shownError = error ?? serverError ?? null;

  return (
    <form onSubmit={submit} noValidate>
      <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>
        {initial ? 'ジャンルを編集' : 'ジャンルを追加'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="ジャンル名"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          error={shownError !== null}
          helperText={shownError ?? ' '}
          slotProps={{ htmlInput: { maxLength: LIMITS.genreNameMax, autoComplete: 'off' } }}
          sx={{ mt: 1 }}
        />
        <Box sx={{ fontSize: 13, color: 'text.secondary', mt: 1, mb: 0.75 }} id="genre-color-label">
          色（お茶の水色）
        </Box>
        <Box
          role="radiogroup"
          aria-labelledby="genre-color-label"
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}
        >
          {sortedColors.map((c) => {
            const selected = c.colorCode === color;
            return (
              <Box
                key={c.colorCode}
                component="button"
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={c.name}
                title={c.name}
                onClick={() => setColor(c.colorCode)}
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: '3px solid #fff',
                  bgcolor: c.colorCode,
                  cursor: 'pointer',
                  p: 0,
                  boxShadow: (theme) =>
                    selected
                      ? `0 0 0 2px ${theme.palette.text.primary}`
                      : `0 0 0 1px ${theme.palette.divider}`,
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                }}
              />
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>キャンセル</Button>
        <Button
          type="submit"
          variant="contained"
          disableElevation
          disabled={pending || color === ''}
        >
          {initial ? '保存' : '追加'}
        </Button>
      </DialogActions>
    </form>
  );
}
