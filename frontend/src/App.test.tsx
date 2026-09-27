import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

// 雛形の疎通確認用テスト（jsdom 上で描画でき、shared を参照できること）
describe('App', () => {
  it('アプリ名を表示する', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Chaicoss' })).toBeDefined();
  });
});
