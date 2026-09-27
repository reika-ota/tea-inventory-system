import Search from '@mui/icons-material/Search';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import type { CompositionEvent } from 'react';
import { useRef, useState } from 'react';

interface SearchBoxProps {
  /** 確定した検索語（URL に保持している値） */
  value: string;
  /** 検索語が確定したときに呼ぶ */
  onChange(value: string): void;
}

const LABEL = '銘柄名・フレーバーで探す';

/**
 * SC-02 の検索欄。
 * 入力中の文字は画面の中（state）で持ち、日本語入力の変換中は onChange を呼ばない。
 * 変換中の文字を URL 経由で入力欄に戻すと、変換が崩れるため（「うう b うば」のようになる）。
 */
export function SearchBox({ value, onChange }: SearchBoxProps) {
  const [text, setText] = useState(value);
  const composingRef = useRef(false);

  // 外から検索語が変わった場合（「絞り込みを解除」など）は入力欄に反映する。
  // 描画中に前回の値と比べて state を合わせる、React 推奨の書き方
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }

  return (
    <Paper
      variant="outlined"
      sx={{ mx: 2, mt: 1, px: 1.5, height: 44, display: 'flex', alignItems: 'center', gap: 1 }}
    >
      <Search sx={{ color: 'text.secondary' }} aria-hidden />
      <InputBase
        type="search"
        placeholder={LABEL}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (!composingRef.current) onChange(e.target.value);
        }}
        inputProps={{
          'aria-label': LABEL,
          // 変換の開始・確定は input 要素で受け取る
          onCompositionStart: () => {
            composingRef.current = true;
          },
          onCompositionEnd: (e: CompositionEvent<HTMLInputElement>) => {
            composingRef.current = false;
            onChange(e.currentTarget.value);
          },
        }}
        sx={{ flex: 1 }}
      />
    </Paper>
  );
}
