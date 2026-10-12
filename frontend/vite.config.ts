import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  // GitHub Pages のパス（https://<user>.github.io/tea-inventory-system/）
  base: '/tea-inventory-system/',
  plugins: [react()],
  // 設定画面に表示するアプリのバージョン（frontend/package.json の version）
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
