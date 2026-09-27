import { readFileSync } from 'node:fs';
import nodeResolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';

/**
 * GAS はトップレベルの関数宣言をトリガー関数（doPost 等）として扱うため、
 * ES module の出力末尾に付く `export { ... };` を取り除く。
 */
function stripExports() {
  return {
    name: 'strip-exports',
    renderChunk(code) {
      return { code: code.replace(/^export\s*\{[^}]*\};?\s*$/gm, ''), map: null };
    },
  };
}

/** clasp push の対象（dist）に appsscript.json を含める */
function emitManifest() {
  return {
    name: 'emit-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'appsscript.json',
        source: readFileSync(new URL('./appsscript.json', import.meta.url), 'utf8'),
      });
    },
  };
}

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/Code.js',
    format: 'es',
  },
  plugins: [
    nodeResolve({ extensions: ['.ts', '.js'] }),
    esbuild({ target: 'es2019' }),
    stripExports(),
    emitManifest(),
  ],
};
