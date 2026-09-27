import { APP_NAME } from '@chaicoss/shared';
import { useState } from 'react';

// スパイク（実装順序2）の仮画面：GAS の固定レスポンスを取得して表示する。
// 実装順序5・6で、ルーティング・認証ガード付きの画面に置き換える。
export default function App() {
  const [result, setResult] = useState<string>('');

  async function callGas() {
    setResult('接続中…');
    try {
      // GAS はプリフライト（OPTIONS）に応答できないため text/plain で送る（技術選定 5 No.2）
      const res = await fetch(import.meta.env.VITE_GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping', payload: {} }),
      });
      setResult(JSON.stringify(await res.json(), null, 2));
    } catch (e) {
      setResult(`失敗：${String(e)}`);
    }
  }

  return (
    <main>
      <h1>{APP_NAME}</h1>
      <button type="button" onClick={() => void callGas()}>
        GAS に接続
      </button>
      <pre>{result}</pre>
    </main>
  );
}
