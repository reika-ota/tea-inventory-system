import { describe, expect, it } from 'vitest';
import { APP_NAME } from './index';

// 雛形の疎通確認用テスト（Vitest が shared を読み込めること）
describe('shared', () => {
  it('アプリ名を公開している', () => {
    expect(APP_NAME).toBe('Chaicoss');
  });
});
