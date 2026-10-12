// SC-05 購入登録（UI設計 2.5）
import type { Brand, GetAllData, ReceiveLotPayload } from '@chaicoss/shared';
import {
  activeLotsOf,
  checkQuantity,
  fillRatio,
  servingsOf,
  toJstDate,
  validateReceiveLot,
} from '@chaicoss/shared';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiCallError } from '../api/client';
import { useReceiveLot } from '../api/mutations';
import { useAllData } from '../api/queries';
import { AppHeader } from '../components/AppHeader';
import { FormFooter } from '../components/FormFooter';
import { focusFirstError } from '../components/formErrors';
import { LoadError, Loading } from '../components/QueryStatus';
import { TeaCup } from '../components/TeaCup';
import { FALLBACK_COLOR } from '../features/inventory/BrandRow';
import { lastPurchaseQty } from '../features/stock/lastPurchase';
import { useFeedback } from '../feedback/FeedbackContext';
import { FORM_LABELS, formatQty } from '../format';

const FIELD_ORDER = ['qty', 'bestBefore', 'purchasedOn'] as const;

export function PurchasePage() {
  const { brandId = '' } = useParams();
  const { data, isPending, error, refetch } = useAllData();

  if (isPending) {
    return (
      <>
        <AppHeader title="購入を登録" back />
        <Loading />
      </>
    );
  }
  if (error) {
    return (
      <>
        <AppHeader title="購入を登録" back />
        <LoadError error={error} onRetry={() => void refetch()} />
      </>
    );
  }
  const brand = data.brands.find((b) => b.brandId === brandId && !b.isDeleted);
  if (!brand) {
    return (
      <>
        <AppHeader title="購入を登録" back />
        <Box sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
          銘柄が見つかりません
        </Box>
      </>
    );
  }
  // 銘柄ごとに入力欄の初期値（前回の購入量）を設定し直すため、key で作り直す
  return <PurchaseForm key={brand.brandId} brand={brand} data={data} />;
}

function PurchaseForm({ brand, data }: { brand: Brand; data: GetAllData }) {
  const navigate = useNavigate();
  const receive = useReceiveLot();
  const { notify } = useFeedback();
  const today = toJstDate(new Date());
  const lastQty = lastPurchaseQty(data, brand.brandId);

  const [qty, setQty] = useState(lastQty === null ? '' : String(lastQty));
  const [bestBefore, setBestBefore] = useState('');
  const [purchasedOn, setPurchasedOn] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const genre = data.genres.find((g) => g.genreId === brand.genreId);
  const activeCount = activeLotsOf(data.lots, brand.brandId).length;
  const unit = brand.form === 'BAG' ? '個' : 'g';

  // 入力に合わせて「＝○杯分」を表示する
  const qtyValue = checkQuantity(qty.trim() === '' ? undefined : Number(qty), brand.form);
  const servingsHelp = qtyValue.ok
    ? `＝${servingsOf(qtyValue.value, brand.servingAmount)}杯分`
    : ' ';

  const showErrors = (fieldErrors: Record<string, string>) => {
    setErrors(fieldErrors);
    focusFirstError(FIELD_ORDER, fieldErrors);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = {
      brandId: brand.brandId,
      qty: qty.trim() === '' ? undefined : Number(qty),
      bestBefore: bestBefore === '' ? null : bestBefore,
      purchasedOn,
    };
    const result = validateReceiveLot(input, brand.form, today);
    if (!result.ok) {
      showErrors(result.fieldErrors);
      return;
    }
    const payload: ReceiveLotPayload = result.value;
    receive.mutate(payload, {
      onSuccess: () => {
        notify('購入を登録しました');
        navigate(`/brands/${brand.brandId}`, { replace: true });
      },
      onError: (err) => {
        if (err instanceof ApiCallError && err.fieldErrors) showErrors(err.fieldErrors);
      },
    });
  };

  return (
    <>
      <AppHeader title="購入を登録" back />
      {/* 内容が短くても確定ボタンが画面の下端に来るよう、アプリバーを除いた高さいっぱいに広げる */}
      <Box
        component="form"
        noValidate
        onSubmit={submit}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 56px)' }}
      >
        <Box component="main" sx={{ flex: 1 }}>
          {/* 銘柄の概要 */}
          <Paper
            square
            elevation={0}
            sx={{
              p: 2,
              display: 'flex',
              gap: 1.5,
              alignItems: 'center',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <TeaCup color={genre?.color ?? FALLBACK_COLOR} ratio={fillRatio(data.lots, brand)} />
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ fontWeight: 700 }}>{brand.name}</Box>
              <Box sx={{ fontSize: 13, color: 'text.secondary' }}>
                {genre?.name}／{FORM_LABELS[brand.form]}／1杯{' '}
                {formatQty(brand.servingAmount, brand.form)}
              </Box>
            </Box>
          </Paper>

          <Paper
            square
            elevation={0}
            sx={{ px: 2, pt: 0.5, pb: 2.5, borderBottom: 1, borderColor: 'divider' }}
          >
            {activeCount > 0 && (
              <Box
                sx={{
                  mt: 1.75,
                  fontSize: 13,
                  bgcolor: 'soft.primary',
                  color: 'primary.main',
                  borderRadius: '8px',
                  px: 1.5,
                  py: 1.25,
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-start',
                }}
              >
                <InfoOutlined fontSize="small" aria-hidden />
                在庫が{activeCount}ロットあります。今回の購入は別のロットとして登録します。
              </Box>
            )}

            <TextField
              id="qty"
              label={`購入量（${unit}）`}
              required
              fullWidth
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              error={Boolean(errors.qty)}
              helperText={errors.qty ?? servingsHelp}
              slotProps={{
                htmlInput: { inputMode: 'decimal', step: brand.form === 'BAG' ? 1 : 0.1, min: 0 },
              }}
              sx={{ mt: 2.25 }}
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 2.25 }}>
              <TextField
                id="bestBefore"
                label="賞味期限"
                fullWidth
                type="date"
                value={bestBefore}
                onChange={(e) => setBestBefore(e.target.value)}
                error={Boolean(errors.bestBefore)}
                helperText={errors.bestBefore ?? 'わからない場合は空欄のまま登録できます'}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              {bestBefore !== '' && (
                <Button onClick={() => setBestBefore('')} sx={{ height: 56, flex: 'none' }}>
                  クリア
                </Button>
              )}
            </Box>

            <TextField
              id="purchasedOn"
              label="購入日"
              required
              fullWidth
              type="date"
              value={purchasedOn}
              onChange={(e) => setPurchasedOn(e.target.value)}
              error={Boolean(errors.purchasedOn)}
              helperText={errors.purchasedOn ?? ' '}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
              sx={{ mt: 2.25 }}
            />
          </Paper>
        </Box>
        <FormFooter label="購入を登録" pending={receive.isPending} />
      </Box>
    </>
  );
}
