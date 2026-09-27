// MUI テーマ（UI設計 1.2 配色・1.3 文字）
import { createTheme } from '@mui/material/styles';

/** 強調・選択状態の淡色（背景に使う） */
export interface SoftColors {
  primary: string;
  expired: string;
  near: string;
  low: string;
}

// MUI の Palette に淡色（soft）を追加する（TypeScript の型の拡張）
declare module '@mui/material/styles' {
  interface Palette {
    soft: SoftColors;
  }
  interface PaletteOptions {
    soft?: SoftColors;
  }
}

const fontFamily = '"Zen Kaku Gothic New", system-ui, sans-serif';

export const theme = createTheme({
  palette: {
    primary: { main: '#3f6b3a' },
    error: { main: '#b3261e' }, // 期限切れ・削除
    warning: { main: '#9a5f07' }, // 期限間近
    info: { main: '#2f5b7a' }, // 残りわずか
    background: { default: '#eef1ec', paper: '#ffffff' },
    text: { primary: '#1d2621', secondary: '#5d6b62' },
    divider: '#d9dfd8',
    soft: { primary: '#e3ebdf', expired: '#f8e1de', near: '#f7ead2', low: '#dfe9f1' },
  },
  typography: {
    fontFamily,
    fontSize: 15,
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // 数字は等幅にして、残量や杯数の桁をそろえる
        body: { fontVariantNumeric: 'tabular-nums' },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        // iOS で入力時に画面が拡大されないよう、入力欄は16px以上にする
        input: { fontSize: 16 },
      },
    },
  },
});
