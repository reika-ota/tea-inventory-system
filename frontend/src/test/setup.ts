import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// テストごとに描画した画面を片付ける（Vitest のグローバル API を使わない設定のため明示する）
afterEach(() => {
  cleanup();
});
