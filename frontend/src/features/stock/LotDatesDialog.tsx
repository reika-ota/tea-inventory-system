// 賞味期限・購入日の修正ダイアログ（SC-03 のロットの操作メニュー）
import type { IsoDate, Lot } from '@chaicoss/shared';
import { validateUpdateLot } from '@chaicoss/shared';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import type { FormEvent } from 'react';
import { useState } from 'react';

interface LotDatesDialogProps {
  /** 修正するロット（null なら閉じる） */
  lot: Lot | null;
  today: IsoDate;
  onConfirm(dates: { bestBefore: IsoDate | null; purchasedOn: IsoDate }): void;
  onCancel(): void;
}

export function LotDatesDialog({ lot, today, onConfirm, onCancel }: LotDatesDialogProps) {
  return (
    <Dialog
      open={lot !== null}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
    >
      {/* 開くたびに入力欄をロットの値に戻すため、ロットごとに作り直す */}
      {lot && (
        <DatesForm
          key={lot.lotId}
          lot={lot}
          today={today}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </Dialog>
  );
}

function DatesForm({
  lot,
  today,
  onConfirm,
  onCancel,
}: Omit<LotDatesDialogProps, 'lot'> & { lot: Lot }) {
  const [bestBefore, setBestBefore] = useState(lot.bestBefore ?? '');
  const [purchasedOn, setPurchasedOn] = useState(lot.purchasedOn);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateUpdateLot(
      { lotId: lot.lotId, version: lot.version, bestBefore, purchasedOn },
      today,
    );
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    onConfirm({
      bestBefore: result.value.bestBefore ?? null,
      purchasedOn: result.value.purchasedOn,
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>賞味期限・購入日を修正</DialogTitle>
      <DialogContent>
        <TextField
          label="賞味期限"
          type="date"
          fullWidth
          value={bestBefore}
          onChange={(e) => setBestBefore(e.target.value)}
          error={Boolean(errors.bestBefore)}
          helperText={errors.bestBefore ?? '空欄にすると「期限未入力」になります'}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ mt: 1 }}
        />
        <TextField
          label="購入日"
          type="date"
          required
          fullWidth
          value={purchasedOn}
          onChange={(e) => setPurchasedOn(e.target.value)}
          error={Boolean(errors.purchasedOn)}
          helperText={errors.purchasedOn ?? ' '}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>キャンセル</Button>
        <Button type="submit" variant="contained" disableElevation>
          保存
        </Button>
      </DialogActions>
    </form>
  );
}
