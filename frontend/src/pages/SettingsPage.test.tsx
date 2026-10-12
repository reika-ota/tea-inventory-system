// SC-07 設定
import type { GetAllData } from '@chaicoss/shared';
import { makeBrand, makeGenre, makeLot } from '@chaicoss/shared/testing';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAuth } from '../test/fakeAuth';
import { setFakeApi } from '../test/fakeApi';
import type { FakeServer } from '../test/fakeServer';
import { createFakeServer } from '../test/fakeServer';
import { renderApp } from '../test/renderApp';

vi.mock('../api/useApi', () => import('../test/fakeApi'));

const data: GetAllData = {
  genres: [
    makeGenre({ genreId: 'black', name: '紅茶', color: '#9a3f1c', sortOrder: 1 }),
    makeGenre({ genreId: 'green', name: '緑茶', color: '#7a9a3a', sortOrder: 2 }),
    makeGenre({ genreId: 'white', name: '白茶', color: '#cdb97e', sortOrder: 3 }),
  ],
  colors: [
    { colorCode: '#9a3f1c', name: '紅茶色', sortOrder: 1 },
    { colorCode: '#7a9a3a', name: '煎茶色', sortOrder: 2 },
    { colorCode: '#cdb97e', name: '白茶色', sortOrder: 3 },
    { colorCode: '#4f7f9a', name: '藍色', sortOrder: 4 },
  ],
  brands: [
    makeBrand({ brandId: 'uba', name: 'ウバ', genreId: 'black' }),
    makeBrand({
      brandId: 'gone',
      name: '玉露',
      genreId: 'green',
      isDeleted: true,
      deletedAt: '2026-10-01T10:00:00+09:00',
    }),
  ],
  lots: [
    makeLot({
      lotId: 'used',
      brandId: 'uba',
      initialQty: 50,
      remainingQty: 0,
      isDepleted: true,
      depletedAt: '2026-10-05T10:00:00+09:00',
    }),
  ],
};

let server: FakeServer;

beforeEach(() => {
  server = createFakeServer(data, [
    {
      historyId: 'd',
      occurredAt: '2026-10-05T10:00:00+09:00',
      userEmail: 'taro@example.com',
      lotId: 'used',
      brandId: 'uba',
      delta: -7,
      servings: null,
      qtyAfter: 0,
      reason: 'DEPLETE',
      opId: 'op',
    },
  ]);
  setFakeApi((action, payload) => server.handle(action, payload));
});

const openGenreMenu = async (name: string) => {
  fireEvent.click(await screen.findByRole('button', { name: `${name}の操作` }));
  return screen.findByRole('menu');
};

/** ジャンルの並び（表示順） */
const genreNames = () =>
  screen
    .getAllByRole('button', { name: /の操作$/ })
    .map((b) => b.getAttribute('aria-label')?.replace('の操作', ''));

describe('SC-07 設定：ジャンル', () => {
  it('ジャンルを表示順に、削除していない銘柄の数とともに表示する', async () => {
    renderApp('/settings');
    expect(await screen.findByText('1銘柄')).toBeDefined();
    expect(genreNames()).toEqual(['紅茶', '緑茶', '白茶']);
  });

  it('ジャンルを追加する（まだ使われていない色を初期選択、表示順は最後）', async () => {
    renderApp('/settings');
    fireEvent.click(await screen.findByRole('button', { name: '追加' }));
    const dialog = await screen.findByRole('dialog', { name: 'ジャンルを追加' });
    expect(within(dialog).getByRole('radio', { name: '藍色' }).getAttribute('aria-checked')).toBe(
      'true',
    );

    fireEvent.change(within(dialog).getByLabelText('ジャンル名'), {
      target: { value: ' ほうじ茶 ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '追加' }));
    expect(await screen.findByText('ジャンルを追加しました')).toBeDefined();
    expect(server.requests[0]).toEqual({
      action: 'createGenre',
      payload: { name: 'ほうじ茶', color: '#4f7f9a', sortOrder: 4 },
    });
    await waitFor(() => expect(genreNames()).toContain('ほうじ茶'));
  });

  it('名前が空・重複している場合はダイアログにエラーを表示する', async () => {
    renderApp('/settings');
    fireEvent.click(await screen.findByRole('button', { name: '追加' }));
    const dialog = await screen.findByRole('dialog', { name: 'ジャンルを追加' });
    fireEvent.click(within(dialog).getByRole('button', { name: '追加' }));
    expect(within(dialog).getByText('入力してください')).toBeDefined();
    fireEvent.change(within(dialog).getByLabelText('ジャンル名'), { target: { value: '緑茶' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '追加' }));
    expect(within(dialog).getByText('同じ名前のジャンルがあります')).toBeDefined();
    expect(server.requests).toEqual([]);
  });

  it('名前・色を変更する', async () => {
    renderApp('/settings');
    const menu = await openGenreMenu('白茶');
    fireEvent.click(within(menu).getByRole('menuitem', { name: '名前・色を変更' }));
    const dialog = await screen.findByRole('dialog', { name: 'ジャンルを編集' });
    expect(within(dialog).getByRole('radio', { name: '白茶色' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    fireEvent.change(within(dialog).getByLabelText('ジャンル名'), {
      target: { value: '白茶（福建）' },
    });
    fireEvent.click(within(dialog).getByRole('radio', { name: '藍色' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '保存' }));
    expect(await screen.findByText('保存しました')).toBeDefined();
    expect(server.requests[0]).toEqual({
      action: 'updateGenre',
      payload: {
        genreId: 'white',
        version: 1,
        sortOrder: 3,
        name: '白茶（福建）',
        color: '#4f7f9a',
      },
    });
  });

  it('上へ移動・下へ移動で並べ替える（先頭の上へ・最後の下へは無効）', async () => {
    renderApp('/settings');
    let menu = await openGenreMenu('紅茶');
    expect(within(menu).getByRole('menuitem', { name: '上へ移動' })).toHaveProperty(
      'disabled',
      true,
    );
    fireEvent.click(within(menu).getByRole('menuitem', { name: '下へ移動' }));
    await waitFor(() => expect(genreNames()).toEqual(['緑茶', '紅茶', '白茶']));
    expect(
      server.requests.map((r) => [
        r.action,
        (r.payload as { genreId: string; sortOrder: number }).genreId,
        (r.payload as { sortOrder: number }).sortOrder,
      ]),
    ).toEqual([
      ['updateGenre', 'green', 1],
      ['updateGenre', 'black', 2],
    ]);
    menu = await openGenreMenu('白茶');
    expect(within(menu).getByRole('menuitem', { name: '下へ移動' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('銘柄（削除済みを含む）から使われているジャンルは削除できない', async () => {
    renderApp('/settings');
    const menu = await openGenreMenu('緑茶'); // 削除した銘柄だけが使っている
    const item = within(menu).getByRole('menuitem', { name: /削除/ });
    expect(item).toHaveProperty('disabled', true);
    expect(item.textContent).toContain(
      'このジャンルの銘柄があるため削除できません（削除した銘柄を含む）',
    );
  });

  it('使われていないジャンルは確認して削除する', async () => {
    renderApp('/settings');
    const menu = await openGenreMenu('白茶');
    fireEvent.click(within(menu).getByRole('menuitem', { name: '削除' }));
    const confirm = await screen.findByRole('dialog', { name: 'ジャンルを削除しますか？' });
    expect(within(confirm).getByText('「白茶」を削除します。')).toBeDefined();
    fireEvent.click(within(confirm).getByRole('button', { name: '削除する' }));
    expect(await screen.findByText('ジャンルを削除しました')).toBeDefined();
    await waitFor(() => expect(genreNames()).toEqual(['紅茶', '緑茶']));
  });
});

describe('SC-07 設定：復元・アカウント', () => {
  it('削除した銘柄を復元する', async () => {
    renderApp('/settings');
    expect(await screen.findByText('削除した銘柄（1）')).toBeDefined();
    expect(screen.getByText('緑茶／削除 2026/10/01')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '復元' }));
    expect(await screen.findByText('「玉露」を復元しました')).toBeDefined();
    expect(await screen.findByText('削除した銘柄はありません')).toBeDefined();
  });

  it('使い切ったロットを元に戻す', async () => {
    renderApp('/settings');
    expect(await screen.findByText('購入 50g／使い切り 2026/10/05')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '元に戻す' }));
    expect(await screen.findByText('使い切りを取り消しました')).toBeDefined();
    expect(server.requests[0]).toEqual({
      action: 'restoreLot',
      payload: { lotId: 'used', version: 1 },
    });
    expect(await screen.findByText('使い切ったロットはありません')).toBeDefined();
  });

  it('ログイン中のメールアドレスを表示し、確認してログアウトする', async () => {
    const auth = fakeAuth();
    renderApp('/settings', auth);
    expect(await screen.findByText('taro@example.com')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));
    const confirm = await screen.findByRole('dialog', { name: 'ログアウトしますか？' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'ログアウト' }));
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('アプリのバージョンを表示する', async () => {
    renderApp('/settings');
    expect(await screen.findByText(/^Chaicoss バージョン \d+\.\d+\.\d+$/)).toBeDefined();
  });
});
