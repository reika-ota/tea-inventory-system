import { defineConfig } from 'vitest/config';

// 各ワークスペースを Vitest のプロジェクトとしてまとめて実行する
export default defineConfig({
  test: {
    projects: ['shared', 'gas', 'frontend'],
  },
});
