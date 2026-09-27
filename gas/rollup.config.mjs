import { readFileSync } from 'node:fs';
import nodeResolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';

/**
 * GAS はトップレベルの関数宣言をトリガー関数（doPost 等）として扱うため、
 * ES module の出力末尾に付く `export { ... };` を取り除く。
 * 名前の衝突で関数名が変わった場合（`export { doPost$1 as doPost }`）は、GAS から呼べなくなるためビルドを失敗させる。
 */
function stripExports() {
  const pattern = /^export\s*\{([^}]*)\};?\s*$/gm;
  return {
    name: 'strip-exports',
    renderChunk(code) {
      for (const [, names] of code.matchAll(pattern)) {
        if (/\bas\b/.test(names)) {
          this.error(`トップレベルの関数名が変わっています: export {${names}}`);
        }
      }
      return { code: code.replace(pattern, ''), map: null };
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
