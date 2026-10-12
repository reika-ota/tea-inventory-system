// @vitest-environment node
// PWA（実装順序9）：マニフェストとアイコンの対応を確認する
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicDir = new URL('../public/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, publicDir));

interface Manifest {
  name: string;
  start_url: string;
  display: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
}

const manifest = JSON.parse(read('manifest.webmanifest').toString('utf8')) as Manifest;

/** PNG の幅と高さ（IHDR チャンク） */
function pngSize(name: string): string {
  const png = read(name);
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

describe('マニフェスト', () => {
  it('ホーム画面からアプリとして起動する設定', () => {
    expect(manifest).toMatchObject({ name: 'Chaicoss', display: 'standalone' });
    // マニフェストの場所（/tea-inventory-system/）からの相対指定にする（GitHub Pages のパスに合わせる）
    expect(manifest.start_url).toBe('.');
  });

  it('192px・512px・マスカブルのアイコンがあり、ファイルの大きさが宣言と一致する', () => {
    expect(manifest.icons.map((i) => [i.sizes, i.purpose ?? 'any'])).toEqual([
      ['192x192', 'any'],
      ['512x512', 'any'],
      ['512x512', 'maskable'],
    ]);
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith('/')).toBe(false);
      expect(pngSize(icon.src)).toBe(icon.sizes);
    }
  });
});

describe('index.html', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  it.each([
    ['manifest', 'manifest.webmanifest'],
    ['apple-touch-icon', 'apple-touch-icon.png'],
    ['icon', 'favicon.ico'],
    ['icon', 'favicon.svg'],
  ])('rel="%s" で %s を読み込み、ファイルがある', (rel, file) => {
    expect(html).toContain(`rel="${rel}" href="/${file}"`);
    expect(existsSync(new URL(file, publicDir))).toBe(true);
  });

  it('iPhone のホーム画面用アイコンは 180px', () => {
    expect(pngSize('apple-touch-icon.png')).toBe('180x180');
  });
});
