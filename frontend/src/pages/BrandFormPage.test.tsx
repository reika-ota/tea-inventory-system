// SC-04 銘柄登録・編集、SC-03 の銘柄の削除
import type { GetAllData } from '@chaicoss/shared';
import { makeBrand, makeGenre, makeLot } from '@chaicoss/shared/testing';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setFakeApi } from '../test/fakeApi';
import type { FakeServer } from '../test/fakeServer';
import { createFakeServer } from '../test/fakeServer';
import { renderApp } from '../test/renderApp';

vi.mock('../api/useApi', () => import('../test/fakeApi'));

const data: GetAllData = {
  genres: [
    makeGenre({ genreId: 'g1', name: '紅茶', sortOrder: 1 }),
    makeGenre({ genreId: 'g2', name: '緑茶', sortOrder: 2 }),
  ],
  colors: [],
  brands: [
    makeBrand({
      brandId: 'uba',
      name: 'ウバ',
      genreId: 'g1',
      flavors: ['ベルガモット'],
      version: 2,
    }),
    makeBrand({ brandId: 'empty', name: '水仙', genreId: 'g2', flavors: ['桜'], shop: '茶舗' }),
    makeBrand({ brandId: 'gone', name: '削除済み', genreId: 'g1', isDeleted: true }),
  ],
  lots: [makeLot({ brandId: 'uba' }), makeLot({ brandId: 'empty', isDepleted: true })],
};

let server: FakeServer;

beforeEach(() => {
  server = createFakeServer(data);
  setFakeApi((action, payload) => server.handle(action, payload));
});

const nameInput = () => screen.findByRole('textbox', { name: '銘柄名' });
const submit = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('SC-04 銘柄を登録', () => {
  it('SC-02 の追加ボタンから開く', async () => {
    renderApp('/');
    expect((await screen.findByRole('link', { name: '銘柄を登録' })).getAttribute('href')).toBe(
      '/brands/new',
    );
  });

  it('必須項目が未入力ならエラーを表示し、登録しない', async () => {
    renderApp('/brands/new');
    await nameInput();
    submit('次へ：購入を登録');
    expect(await screen.findByText('入力してください')).toBeDefined();
    expect(screen.getByText('ジャンルを選んでください')).toBeDefined();
    expect(server.requests).toEqual([]);
  });

  it('入力して登録すると、続けて購入登録へ進む', async () => {
    renderApp('/brands/new');
    fireEvent.change(await nameInput(), { target: { value: ' 白牡丹 ' } });
    fireEvent.click(screen.getByRole('radio', { name: '緑茶' }));

    // フレーバー：入力して Enter、候補をタップ、×で外す
    const flavor = screen.getByRole('textbox', { name: 'フレーバー' });
    fireEvent.change(flavor, { target: { value: '梨' } });
    fireEvent.keyDown(flavor, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '桜' })); // 候補
    fireEvent.click(screen.getByRole('button', { name: 'ベルガモット' }));
    fireEvent.click(screen.getByRole('button', { name: 'ベルガモットを外す' }));

    fireEvent.change(screen.getByLabelText('1杯の量（g）'), { target: { value: '2.5' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'メモ' }), {
      target: { value: '春限定' },
    });
    submit('次へ：購入を登録');

    expect(await screen.findByText('銘柄を登録しました')).toBeDefined();
    expect(server.requests).toEqual([
      {
        action: 'createBrand',
        payload: {
          name: '白牡丹',
          genreId: 'g2',
          flavors: ['梨', '桜'],
          form: 'LEAF',
          servingAmount: 2.5,
          shop: null,
          memo: '春限定',
        },
      },
    ]);
    expect(await screen.findByRole('heading', { name: '購入を登録' })).toBeDefined();
    expect(screen.getByText('白牡丹')).toBeDefined();
  });

  it('ティーバッグは1杯の量の入力欄を出さず、1個で登録する', async () => {
    renderApp('/brands/new');
    fireEvent.change(await nameInput(), { target: { value: 'JAFTEA' } });
    fireEvent.click(screen.getByRole('radio', { name: '紅茶' }));
    fireEvent.click(screen.getByRole('button', { name: 'ティーバッグ' }));
    expect(screen.getByText('1個（ティーバッグは1杯＝1個）')).toBeDefined();
    expect(screen.queryByLabelText('1杯の量（g）')).toBeNull();
    submit('次へ：購入を登録');
    await screen.findByText('銘柄を登録しました');
    expect(server.requests[0]?.payload).toMatchObject({ form: 'BAG', servingAmount: 1 });
  });

  it('フレーバーの重複は追加しない', async () => {
    renderApp('/brands/new');
    await nameInput();
    const flavor = screen.getByRole('textbox', { name: 'フレーバー' });
    for (let i = 0; i < 2; i++) {
      fireEvent.change(flavor, { target: { value: '梨' } });
      fireEvent.click(screen.getByRole('button', { name: '追加' }));
    }
    expect(screen.getByText('同じフレーバーが重複しています')).toBeDefined();
    expect(screen.getAllByRole('button', { name: '梨を外す' })).toHaveLength(1);
  });

  it('同じ名前の銘柄があれば注意する（削除済みなら復元を案内）', async () => {
    renderApp('/brands/new');
    fireEvent.change(await nameInput(), { target: { value: 'ウバ' } });
    expect(screen.getByText('同じ名前の銘柄がすでにあります')).toBeDefined();
    fireEvent.change(await nameInput(), { target: { value: '削除済み' } });
    expect(
      screen.getByText('削除した銘柄に同じ名前があります（設定から復元できます）'),
    ).toBeDefined();
  });
});

describe('SC-04 銘柄を編集', () => {
  it('今の内容を表示し、保存すると銘柄詳細に戻る', async () => {
    renderApp('/brands/empty/edit');
    const name = await nameInput();
    expect((name as HTMLInputElement).value).toBe('水仙');
    expect(screen.getByRole('radio', { name: '緑茶' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('button', { name: '桜を外す' })).toBeDefined();
    expect((screen.getByRole('textbox', { name: '購入店' }) as HTMLInputElement).value).toBe(
      '茶舗',
    );

    fireEvent.change(name, { target: { value: '水仙（老叢）' } });
    submit('保存');
    expect(await screen.findByText('保存しました')).toBeDefined();
    expect(server.requests[0]).toMatchObject({
      action: 'updateBrand',
      payload: { brandId: 'empty', version: 1, name: '水仙（老叢）', shop: '茶舗' },
    });
    expect(await screen.findByRole('heading', { name: '水仙（老叢）' })).toBeDefined();
  });

  it('在庫が残っている銘柄は形態を変更できない', async () => {
    renderApp('/brands/uba/edit');
    await nameInput();
    expect(screen.getByRole('button', { name: 'ティーバッグ' })).toHaveProperty('disabled', true);
    expect(screen.getByText('在庫が残っているため変更できません')).toBeDefined();
  });

  it('SC-03 の「編集」から開く', async () => {
    renderApp('/brands/uba');
    expect((await screen.findByRole('link', { name: '編集' })).getAttribute('href')).toBe(
      '/brands/uba/edit',
    );
  });
});

describe('SC-03 銘柄の削除', () => {
  const openBrandMenu = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'その他の操作' }));
    return screen.findByRole('menu');
  };

  it('在庫が残っている場合は削除できない（理由を表示）', async () => {
    renderApp('/brands/uba');
    const menu = await openBrandMenu();
    const item = within(menu).getByRole('menuitem', { name: /銘柄を削除/ });
    expect(item).toHaveProperty('disabled', true);
    expect(item.textContent).toContain('在庫が残っているため削除できません');
  });

  it('確認して削除すると在庫一覧に戻り、「元に戻す」で復元できる', async () => {
    renderApp('/brands/empty');
    const menu = await openBrandMenu();
    fireEvent.click(within(menu).getByRole('menuitem', { name: '銘柄を削除' }));
    const confirm = await screen.findByRole('dialog', { name: '銘柄を削除しますか？' });
    expect(within(confirm).getByText(/「水仙」を一覧から外します/)).toBeDefined();
    fireEvent.click(within(confirm).getByRole('button', { name: '削除する' }));

    expect(await screen.findByText('銘柄を削除しました')).toBeDefined();
    expect(await screen.findByRole('heading', { name: '在庫' })).toBeDefined();
    expect(server.requests[0]).toEqual({
      action: 'deleteBrand',
      payload: { brandId: 'empty', version: 1 },
    });
    await waitFor(() => expect(screen.queryByText('在庫なし（0）')).not.toBeNull());

    fireEvent.click(await screen.findByRole('button', { name: '元に戻す' }));
    expect(await screen.findByText('復元しました')).toBeDefined();
    expect(server.requests[1]).toEqual({
      action: 'restoreBrand',
      payload: { brandId: 'empty', version: 2 },
    });
    expect(await screen.findByText('在庫なし（1）')).toBeDefined();
  });
});
