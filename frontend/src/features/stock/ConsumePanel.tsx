// SC-03 上部の消費パネル（UI設計 2.3）：杯数ステッパー＋飲んだ、量指定、残り全部使った
import type { Brand, Lot } from '@chaicoss/shared';
import { maxServingsForLot, multiplyQty } from '@chaicoss/shared';
import Add from '@mui/icons-material/Add';
import AddShoppingCart from '@mui/icons-material/AddShoppingCart';
import Remove from '@mui/icons-material/Remove';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatBestBeforeShort, formatQty } from '../../format';

/** 消費の対象ロット。pinned はロットを指定している場合 */
export interface ConsumeTarget {
  lot: Lot;
  pinned: boolean;
}

interface ConsumePanelProps {
  brand: Brand;
  target: ConsumeTarget | null;
  /** 在庫の操作を実行中（ボタンを無効にする） */
  busy: boolean;
  onDrink(servings: number): void;
  onAmount(): void;
  onUseAll(): void;
  onUnpin(): void;
}

const stepButtonSx = {
  width: 48,
  height: 48,
  border: '1.5px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
} as const;

export function ConsumePanel({
  brand,
  target,
  busy,
  onDrink,
  onAmount,
  onUseAll,
  onUnpin,
}: ConsumePanelProps) {
  const [servings, setServings] = useState(1);
  // 対象ロットが変わったら杯数を1に戻す（描画中に前回の値と比べて state を合わせる）
  const lotId = target?.lot.lotId ?? null;
  const [prevLotId, setPrevLotId] = useState(lotId);
  if (lotId !== prevLotId) {
    setPrevLotId(lotId);
    setServings(1);
  }

  const qty = (value: number) => formatQty(value, brand.form);

  if (!target) {
    return (
      <Panel>
        <Box sx={{ pt: 1, pb: 1.5, textAlign: 'center', color: 'text.secondary', fontSize: 14 }}>
          在庫がありません
        </Box>
        <Button
          component={Link}
          to={`/brands/${brand.brandId}/purchase`}
          variant="contained"
          fullWidth
          disableElevation
          startIcon={<AddShoppingCart />}
          sx={{ height: 56, fontSize: 17, borderRadius: '12px' }}
        >
          再購入を登録
        </Button>
      </Panel>
    );
  }

  const { lot, pinned } = target;
  const max = maxServingsForLot(lot, brand);
  const count = Math.min(Math.max(servings, 1), Math.max(max, 1));

  const drink = () => {
    onDrink(count);
    setServings(1);
  };

  return (
    <Panel>
      <Box
        sx={{
          fontSize: 13,
          color: 'text.secondary',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          mb: 1.75,
        }}
      >
        <span>
          {pinned ? (
            <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
              指定したロット
            </Box>
          ) : (
            '期限が近いロットから'
          )}
          ：{qty(lot.remainingQty)}／{formatBestBeforeShort(lot.bestBefore)}
        </span>
        {pinned && (
          <Button size="small" onClick={onUnpin} sx={{ flex: 'none' }}>
            指定を解除
          </Button>
        )}
      </Box>

      {max >= 1 ? (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2.5,
              mb: 1.75,
            }}
          >
            <IconButton
              aria-label="1杯減らす"
              disabled={count <= 1}
              onClick={() => setServings(count - 1)}
              sx={stepButtonSx}
            >
              <Remove />
            </IconButton>
            <Box sx={{ minWidth: 84, textAlign: 'center' }} aria-live="polite">
              <Box component="b" sx={{ fontSize: 34, fontWeight: 700 }}>
                {count}
              </Box>
              <Box component="span" sx={{ fontSize: 15, ml: 0.25 }}>
                杯
              </Box>
              <Box sx={{ fontSize: 11, color: 'text.secondary' }}>最大{max}杯</Box>
            </Box>
            <IconButton
              aria-label="1杯増やす"
              disabled={count >= max}
              onClick={() => setServings(count + 1)}
              sx={stepButtonSx}
            >
              <Add />
            </IconButton>
          </Box>
          <MainButton disabled={busy} onClick={drink}>
            {count}杯飲んだ（{qty(multiplyQty(brand.servingAmount, count))}）
          </MainButton>
        </>
      ) : (
        <>
          <Box sx={{ fontSize: 13, color: 'warning.main', textAlign: 'center', mb: 1.25 }}>
            1杯分（{qty(brand.servingAmount)}）に足りません
          </Box>
          <MainButton disabled={busy} onClick={onUseAll}>
            残り全部使った（{qty(lot.remainingQty)}）
          </MainButton>
        </>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
        <Button size="small" disabled={busy} onClick={onAmount}>
          量を指定して飲んだ
        </Button>
      </Box>
    </Panel>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ m: 1.5, p: 2, borderRadius: '14px', borderColor: 'divider' }}>
      {children}
    </Paper>
  );
}

function MainButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick(): void;
}) {
  return (
    <Button
      variant="contained"
      fullWidth
      disableElevation
      disabled={disabled}
      onClick={onClick}
      sx={{ height: 56, fontSize: 17, borderRadius: '12px' }}
    >
      {children}
    </Button>
  );
}
