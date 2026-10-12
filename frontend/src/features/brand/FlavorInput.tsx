// フレーバーのタグ入力（UI設計 2.4）：テキスト＋「追加」またはEnter、追加済みはチップ（×で外す）、既存のフレーバーを候補に表示
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import { useRef, useState } from 'react';
import { addFlavor } from './brandForm';

interface FlavorInputProps {
  flavors: string[];
  suggestions: string[];
  /** 送信時の入力チェックのエラー */
  error?: string;
  onChange(flavors: string[]): void;
}

const chipSx = {
  height: 28,
  px: 1.25,
  borderRadius: '14px',
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  fontSize: 12,
} as const;

export function FlavorInput({ flavors, suggestions, error, onChange }: FlavorInputProps) {
  const [text, setText] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 日本語入力の変換を確定する Enter で追加しないため
  const composingRef = useRef(false);

  const add = (raw: string, fromInput: boolean) => {
    const result = addFlavor(flavors, raw);
    if (result === null) return;
    if (!result.ok) {
      setInputError(result.error);
      return;
    }
    setInputError(null);
    onChange(result.flavors);
    if (fromInput) setText('');
    inputRef.current?.focus();
  };

  return (
    <Box id="flavors">
      {flavors.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
          {flavors.map((flavor) => (
            <Box
              key={flavor}
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                height: 30,
                pl: 1.5,
                pr: 0.5,
                borderRadius: '15px',
                bgcolor: 'soft.primary',
                color: 'primary.main',
                fontSize: 13,
              }}
            >
              {flavor}
              <IconButton
                size="small"
                aria-label={`${flavor}を外す`}
                onClick={() => onChange(flavors.filter((f) => f !== flavor))}
                sx={{ width: 24, height: 24, color: 'primary.main' }}
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="例：桜"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setInputError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !composingRef.current) {
              e.preventDefault();
              add(text, true);
            }
          }}
          error={Boolean(inputError ?? error)}
          helperText={inputError ?? error ?? ' '}
          slotProps={{
            htmlInput: {
              'aria-label': 'フレーバー',
              maxLength: 20,
              enterKeyHint: 'done',
              onCompositionStart: () => {
                composingRef.current = true;
              },
              onCompositionEnd: () => {
                composingRef.current = false;
              },
            },
          }}
        />
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() => add(text, true)}
          sx={{ height: 56, flex: 'none' }}
        >
          追加
        </Button>
      </Box>
      {suggestions.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
          <Box component="span" sx={{ fontSize: 12, color: 'text.secondary', mr: 0.25 }}>
            候補
          </Box>
          {suggestions.map((flavor) => (
            <ButtonBase key={flavor} onClick={() => add(flavor, false)} sx={chipSx}>
              {flavor}
            </ButtonBase>
          ))}
        </Box>
      )}
    </Box>
  );
}
