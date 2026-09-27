import Box from '@mui/material/Box';

interface TeaCupProps {
  /** 枠と塗りの色（ジャンルの色） */
  color: string;
  /** 塗りの割合（0〜1）＝有効ロットの残量合計 ÷ 購入量合計 */
  ratio: number;
  /** sm＝一覧（40px）、lg＝詳細（64px） */
  size?: 'sm' | 'lg';
}

/** お茶の色の丸（UI設計 1.5）。円の内側を下から塗りつぶす。装飾のため読み上げない */
export function TeaCup({ color, ratio, size = 'sm' }: TeaCupProps) {
  const fill = `${Math.round(Math.min(Math.max(ratio, 0), 1) * 100)}%`;
  const px = size === 'lg' ? 64 : 40;
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{
        display: 'inline-block',
        flex: 'none',
        width: px,
        height: px,
        borderRadius: '50%',
        border: `${size === 'lg' ? 3 : 2}px solid ${color}`,
        background: `linear-gradient(to top, ${color} ${fill}, #fff ${fill})`,
      }}
    />
  );
}
