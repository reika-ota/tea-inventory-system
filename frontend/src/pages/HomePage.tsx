// 仮のホーム画面（実装順序5の動作確認用）。実装順序6で SC-02 在庫一覧に置き換える。
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { GetAllData } from '@chaicoss/shared';
import { useState } from 'react';
import { ApiCallError } from '../api/client';
import { useApi } from '../api/useApi';
import { useAuth } from '../auth/AuthContext';

export function HomePage() {
  const { email, signOut } = useAuth();
  const callApi = useApi();
  const [data, setData] = useState<GetAllData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setData(await callApi('getAll', {}));
    } catch (e) {
      setError(e instanceof ApiCallError ? e.message : String(e));
    }
  }

  return (
    <Stack component="main" spacing={2} sx={{ maxWidth: 480, mx: 'auto', p: 2 }}>
      <Typography component="h1" variant="h6">
        ログイン中：{email}
      </Typography>
      <Button variant="contained" onClick={() => void load()}>
        データを取得
      </Button>
      {data && (
        <Typography>
          ジャンル{data.genres.length}件、銘柄{data.brands.length}件、ロット{data.lots.length}件
        </Typography>
      )}
      {error && <Typography color="error">{error}</Typography>}
      <Button onClick={() => signOut()}>ログアウト</Button>
    </Stack>
  );
}
