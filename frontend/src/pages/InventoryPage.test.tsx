import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setFakeApi } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';
import { sampleData } from '../test/sampleData';

vi.mock('../api/useApi', () => import('../test/fakeApi'));

/** 在庫のある銘柄の一覧（表示順の銘柄名。在庫なし枠の行は含まない） */
function brandNames(): string[] {
  return Array.from(document.querySelectorAll('[data-name]'), (el) => el.textContent ?? '');
}

describe('SC-02 在庫一覧', () => {
  beforeEach(() => {
    setFakeApi((action) => {
      if (action === 'getAll') return sampleData;
      throw new Error(action);
    });
  });

  it('在庫のある銘柄を注意が必要な順に表示し、行に残り杯数・残量・期限を出す', async () => {
    renderApp('/');
    expect(await screen.findByText('3銘柄を表示')).toBeDefined();
    expect(brandNames()).toEqual(['アールグレイ', 'JAFTEA', '桂花烏龍茶']);

    const kei = screen.getByRole('link', { name: /桂花烏龍茶/ });
    expect(kei.getAttribute('href')).toBe('/brands/kei');
    expect(kei.textContent).toContain('あと21杯'); // 65.5g ÷ 3g
    expect(kei.textContent).toContain('65.5g');
    expect(kei.textContent).toContain('期限 2099/12/31');
    expect(kei.textContent).toContain('ウーロン茶／キンモクセイ');
  });

  it('注意の件数を表示し、タップで絞り込み・もう一度タップで解除する', async () => {
    renderApp('/');
    const expired = await screen.findByRole('button', { name: /^1s*期限切れ$/ });
    fireEvent.click(expired);
    expect(expired.getAttribute('aria-pressed')).toBe('true');
    expect(brandNames()).toEqual(['アールグレイ']);
    fireEvent.click(expired);
    expect(brandNames()).toHaveLength(3);
  });

  it('ジャンルチップ・形態・検索で絞り込む', async () => {
    renderApp('/');
    fireEvent.click(await screen.findByRole('button', { name: /紅茶 2/ }));
    expect(brandNames()).toEqual(['アールグレイ', 'JAFTEA']);

    fireEvent.click(screen.getByRole('button', { name: 'ティーバッグ' }));
    expect(brandNames()).toEqual(['JAFTEA']);

    fireEvent.click(screen.getByRole('button', { name: /すべて 3/ }));
    fireEvent.click(screen.getByRole('button', { name: 'すべて' }));
    fireEvent.change(screen.getByRole('searchbox', { name: '銘柄名・フレーバーで探す' }), {
      target: { value: 'ベルガ' },
    });
    expect(brandNames()).toEqual(['アールグレイ']);
  });

  it('条件に合う銘柄がなければ案内を表示し、絞り込みを解除できる', async () => {
    renderApp('/?q=存在しない');
    expect(await screen.findByText('条件に合う銘柄はありません')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '絞り込みを解除' }));
    expect(brandNames()).toHaveLength(3);
  });

  it('並び替えを変えられる', async () => {
    renderApp('/');
    fireEvent.change(await screen.findByRole('combobox', { name: '並び替え' }), {
      target: { value: 'servings' },
    });
    expect(brandNames()).toEqual(['JAFTEA', 'アールグレイ', '桂花烏龍茶']);
  });

  it('在庫なしの銘柄を別枠で表示する', async () => {
    renderApp('/');
    expect(await screen.findByText('在庫なし（1）')).toBeDefined();
    expect(screen.getByRole('link', { name: /水仙/ }).getAttribute('href')).toBe('/brands/suisen');
  });

  it('取得できなければエラーを表示し、再読み込みできる', async () => {
    let fail = true;
    setFakeApi(() => {
      if (fail) throw new Error('x');
      return sampleData;
    });
    renderApp('/');
    const retry = await screen.findByRole('button', { name: 'もう一度読み込む' });
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByText('3銘柄を表示')).toBeDefined();
  });

  it('下部タブで在庫が選択されている', async () => {
    renderApp('/');
    const nav = await screen.findByRole('navigation');
    expect(within(nav).getByRole('link', { name: '在庫' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });
});
