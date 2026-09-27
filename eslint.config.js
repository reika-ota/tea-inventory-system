import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/', '**/coverage/', 'docs/'] },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    rules: {
      // any は使わない（CLAUDE.md 実装ルール）
      '@typescript-eslint/no-explicit-any': 'error',
      // 先頭が _ の引数・変数は未使用を許容する（GAS のトリガー関数の引数など）
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['*.{js,mjs,ts}', 'gas/rollup.config.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['frontend/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  prettier,
);
