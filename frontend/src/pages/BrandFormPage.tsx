// SC-04 銘柄登録・編集（UI設計 2.4）
import type { Brand, Form, GetAllData } from '@chaicoss/shared';
import { activeLotsOf, validateCreateBrand, validateUpdateBrand } from '@chaicoss/shared';
import Close from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiCallError } from '../api/client';
import { useCreateBrand, useUpdateBrand } from '../api/mutations';
import { useAllData } from '../api/queries';
import { AppHeader } from '../components/AppHeader';
import { FormFooter } from '../components/FormFooter';
import { LoadError, Loading } from '../components/QueryStatus';
import { focusFirstError } from '../components/formErrors';
import { FlavorInput } from '../features/brand/FlavorInput';
import type { BrandDraft } from '../features/brand/brandForm';
import {
  draftFromBrand,
  draftToInput,
  duplicateNameHint,
  emptyDraft,
  flavorSuggestions,
} from '../features/brand/brandForm';
import { useFeedback } from '../feedback/FeedbackContext';
import { FORM_LABELS } from '../format';

const FIELD_ORDER = [
  'name',
  'genreId',
  'flavors',
  'form',
  'servingAmount',
  'shop',
  'memo',
] as const;

/** 閉じる（Close）ボタン付きのアプリバー */
function FormHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <AppHeader
      title={title}
      leading={
        <IconButton
          aria-label="閉じる"
          onClick={() => (location.key === 'default' ? navigate('/') : navigate(-1))}
          sx={{ width: 44, height: 44 }}
        >
          <Close />
        </IconButton>
      }
    />
  );
}

export function BrandFormPage() {
  const { brandId } = useParams();
  const { data, isPending, error, refetch } = useAllData();
  const title = brandId ? '銘柄を編集' : '銘柄を登録';

  if (isPending) {
    return (
      <>
        <FormHeader title={title} />
        <Loading />
      </>
    );
  }
  if (error) {
    return (
      <>
        <FormHeader title={title} />
        <LoadError error={error} onRetry={() => void refetch()} />
      </>
    );
  }
  const brand = brandId ? data.brands.find((b) => b.brandId === brandId) : undefined;
  if (brandId && !brand) {
    return (
      <>
        <FormHeader title={title} />
        <Box sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
          銘柄が見つかりません
        </Box>
      </>
    );
  }
  return <BrandForm key={brandId ?? 'new'} data={data} brand={brand} title={title} />;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Box sx={{ mt: 2.25 }}>
      <Box sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 500, mb: 0.75 }}>
        {label}
        {required && (
          <Box component="span" sx={{ color: 'error.main', ml: 0.25 }} aria-hidden>
            *
          </Box>
        )}
      </Box>
      {children}
    </Box>
  );
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <Box role="alert" sx={{ color: 'error.main', fontSize: 12, mt: 0.5 }}>
      {children}
    </Box>
  );
}

function BrandForm({ data, brand, title }: { data: GetAllData; brand?: Brand; title: string }) {
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const create = useCreateBrand();
  const update = useUpdateBrand();
  const [draft, setDraft] = useState<BrandDraft>(() =>
    brand ? draftFromBrand(brand) : emptyDraft(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isNew = !brand;
  // 編集時、有効ロットがある場合は形態を変更できない（残量の単位が変わるため）
  const formLocked = brand !== undefined && activeLotsOf(data.lots, brand.brandId).length > 0;
  const dupHint = duplicateNameHint(data.brands, draft.name, brand?.brandId ?? null);
  const suggestions = flavorSuggestions(data.brands, draft.flavors);
  const genres = [...data.genres].sort((a, b) => a.sortOrder - b.sortOrder);
  const pending = create.isPending || update.isPending;

  const set = <K extends keyof BrandDraft>(key: K, value: BrandDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors(({ [key === 'serving' ? 'servingAmount' : key]: _removed, ...rest }) => rest);
  };

  const showErrors = (fieldErrors: Record<string, string>) => {
    // ジャンルが未選択の場合は、選択を促す文言にする
    const adjusted =
      fieldErrors.genreId && draft.genreId === null
        ? { ...fieldErrors, genreId: 'ジャンルを選んでください' }
        : fieldErrors;
    setErrors(adjusted);
    focusFirstError(FIELD_ORDER, adjusted);
  };

  const onServerError = (error: unknown) => {
    if (error instanceof ApiCallError && error.fieldErrors) showErrors(error.fieldErrors);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = draftToInput(draft);
    if (isNew) {
      const result = validateCreateBrand(input);
      if (!result.ok) return showErrors(result.fieldErrors);
      create.mutate(result.value, {
        onSuccess: (created) => {
          notify('銘柄を登録しました');
          // 続けて購入を登録する（戻った場合、銘柄は在庫なしとして残る）
          navigate(`/brands/${created.brandId}/purchase`, { replace: true });
        },
        onError: onServerError,
      });
    } else {
      const result = validateUpdateBrand({
        ...input,
        brandId: brand.brandId,
        version: brand.version,
      });
      if (!result.ok) return showErrors(result.fieldErrors);
      update.mutate(result.value, {
        onSuccess: () => {
          notify('保存しました');
          navigate(`/brands/${brand.brandId}`, { replace: true });
        },
        onError: onServerError,
      });
    }
  };

  return (
    <>
      <FormHeader title={title} />
      <Box
        component="form"
        noValidate
        onSubmit={submit}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 56px)' }}
      >
        <Paper
          component="main"
          square
          elevation={0}
          sx={{ flex: 1, px: 2, pt: 0.5, pb: 2.5, borderBottom: 1, borderColor: 'divider' }}
        >
          <Field label="銘柄名" required>
            <TextField
              id="name"
              fullWidth
              placeholder="例：白牡丹"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              error={Boolean(errors.name)}
              helperText={errors.name}
              slotProps={{
                htmlInput: { maxLength: 50, 'aria-label': '銘柄名', autoComplete: 'off' },
              }}
            />
            {dupHint && <Box sx={{ fontSize: 12, color: 'warning.main', mt: 0.5 }}>{dupHint}</Box>}
          </Field>

          <Field label="ジャンル" required>
            <Box
              id="genreId"
              tabIndex={-1}
              role="radiogroup"
              aria-label="ジャンル"
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
            >
              {genres.map((genre) => {
                const selected = draft.genreId === genre.genreId;
                return (
                  <ButtonBase
                    key={genre.genreId}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set('genreId', genre.genreId)}
                    sx={{
                      gap: 0.75,
                      height: 32,
                      px: 1.5,
                      borderRadius: '16px',
                      border: 1,
                      fontSize: 13,
                      ...(selected
                        ? { bgcolor: 'text.primary', color: '#fff', borderColor: 'text.primary' }
                        : { bgcolor: 'background.paper', borderColor: 'divider' }),
                    }}
                  >
                    <Box
                      component="span"
                      aria-hidden
                      sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: genre.color }}
                    />
                    {genre.name}
                  </ButtonBase>
                );
              })}
            </Box>
            <ErrorText>{errors.genreId}</ErrorText>
          </Field>

          <Field label="フレーバー">
            <FlavorInput
              flavors={draft.flavors}
              suggestions={suggestions}
              error={errors.flavors}
              onChange={(flavors) => set('flavors', flavors)}
            />
          </Field>

          <Field label="形態" required>
            <ToggleButtonGroup
              id="form"
              exclusive
              fullWidth
              aria-label="形態"
              value={draft.form}
              disabled={formLocked}
              onChange={(_e, value: Form | null) => value && set('form', value)}
              sx={{ bgcolor: 'background.paper' }}
            >
              {(['LEAF', 'BAG'] as const).map((form) => (
                <ToggleButton
                  key={form}
                  value={form}
                  sx={{
                    py: 1.25,
                    fontSize: 14,
                    '&.Mui-selected': {
                      bgcolor: 'soft.primary',
                      color: 'primary.main',
                      fontWeight: 700,
                    },
                  }}
                >
                  {FORM_LABELS[form]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {formLocked && (
              <Box sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                在庫が残っているため変更できません
              </Box>
            )}
            <ErrorText>{errors.form}</ErrorText>
          </Field>

          <Field label="1杯の量" required>
            {draft.form === 'LEAF' ? (
              <TextField
                id="servingAmount"
                fullWidth
                type="number"
                value={draft.serving}
                onChange={(e) => set('serving', e.target.value)}
                error={Boolean(errors.servingAmount)}
                helperText={
                  errors.servingAmount ?? 'パッケージに記載がなければ3gのままで大丈夫です'
                }
                slotProps={{
                  htmlInput: {
                    inputMode: 'decimal',
                    step: 0.1,
                    min: 0,
                    'aria-label': '1杯の量（g）',
                  },
                  input: { endAdornment: <Box sx={{ ml: 1 }}>g</Box> },
                }}
              />
            ) : (
              <Box
                sx={{
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  px: 1.5,
                  borderRadius: '8px',
                  bgcolor: 'background.default',
                  color: 'text.secondary',
                  fontSize: 14,
                }}
              >
                1個（ティーバッグは1杯＝1個）
              </Box>
            )}
          </Field>

          <Field label="購入店">
            <TextField
              id="shop"
              fullWidth
              value={draft.shop}
              onChange={(e) => set('shop', e.target.value)}
              error={Boolean(errors.shop)}
              helperText={errors.shop}
              slotProps={{
                htmlInput: { maxLength: 50, 'aria-label': '購入店', autoComplete: 'off' },
              }}
            />
          </Field>

          <Field label="メモ">
            <TextField
              id="memo"
              fullWidth
              multiline
              minRows={3}
              value={draft.memo}
              onChange={(e) => set('memo', e.target.value)}
              error={Boolean(errors.memo)}
              helperText={errors.memo}
              slotProps={{ htmlInput: { maxLength: 200, 'aria-label': 'メモ' } }}
            />
          </Field>
        </Paper>
        <FormFooter
          label={isNew ? '次へ：購入を登録' : '保存'}
          pendingLabel={isNew ? '登録しています…' : '保存しています…'}
          pending={pending}
        />
      </Box>
    </>
  );
}
