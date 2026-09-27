import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setFakeApi } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';
import { sampleData, sampleHistories } from '../test/sampleData';

vi.mock('../api/useApi', () => import('../test/fakeApi'));

describe('SC-03 銘柄詳細', () => {
  beforeEach(() => {
    setFakeApi((action, payload) => {
      if (action === 'getAll') return sampleData;
      if (action === 'getHistories') {
        const { brandId } = payload as { brandId: string };
        return sampleHistories.filter((h) => h.brandId === brandId);
      }
      throw new Error(action);
    });
  });

  it('概要：銘柄名、ジャンル・形態・1杯の量、フレーバー、合計残量と残り杯数', async () => {
    renderApp('/brands/kei');
    expect(await screen.findByRole('heading', { name: '桂花烏龍茶' })).toBeDefined();
    expect(screen.getByText('ウーロン茶／茶葉／1杯 3g')).toBeDefined();
    expect(screen.getAllByText('キンモクセイ').length).toBeGreaterThan(0);
    expect(screen.getByText('65.5g')).toBeDefined();
    expect(screen.getByText(/あと21杯/)).toBeDefined();
  });

  it('ロットを引当の順に表示し、先頭に「次に使う」を付ける', async () => {
    renderApp('/brands/kei');
    expect(await screen.findByText('ロット（2）')).toBeDefined();
    const next = screen.getByText('次に使う');
    // 次に使うのは期限のあるロット（45.5g）
    expect(next.parentElement?.parentElement?.textContent).toContain('45.5g');
    expect(screen.getByText(/期限未入力/)).toBeDefined();
    expect(screen.getByText(/購入 2026\/08\/01/)).toBeDefined();
  });

  it('情報：購入店・メモが未入力なら —', async () => {
    renderApp('/brands/earl');
    expect(await screen.findByText('紅茶専門店')).toBeDefined();
    expect(screen.getByText('メモ').nextElementSibling?.textContent).toBe('—');
  });

  it('履歴：区分（杯数）、日付、操作者（@より前）、増減量、操作後の残量', async () => {
    renderApp('/brands/kei');
    expect(await screen.findByText('飲んだ（2杯）')).toBeDefined();
    expect(screen.getByText(/2026\/09\/27.*hanako/)).toBeDefined();
    expect(screen.getByText('-6g')).toBeDefined();
    expect(screen.getByText('残 45.5g')).toBeDefined();
    expect(screen.getByText('+51.5g')).toBeDefined();
  });

  it('使い切ったロットは初めは閉じており、開くと表示する', async () => {
    renderApp('/brands/suisen');
    const toggle = await screen.findByRole('button', { name: /使い切ったロット（1）/ });
    expect(screen.queryByText('使い切り')).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('使い切り')).toBeDefined();
    expect(screen.getByText('有効なロットはありません')).toBeDefined();
  });

  it('銘柄が見つからなければ案内を表示する', async () => {
    renderApp('/brands/missing');
    expect(await screen.findByText('銘柄が見つかりません')).toBeDefined();
  });

  it('詳細画面では下部タブを表示しない', async () => {
    renderApp('/brands/kei');
    await screen.findByRole('heading', { name: '桂花烏龍茶' });
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
