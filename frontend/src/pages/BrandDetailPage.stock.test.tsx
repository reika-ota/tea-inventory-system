// SC-03 の在庫操作（飲んだ・量の指定・使い切り・元に戻す）
import type { GetAllData } from '@chaicoss/shared';
import { ERROR_MESSAGES } from '@chaicoss/shared';
import { makeBrand, makeGenre, makeLot } from '@chaicoss/shared/testing';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiCallError } from '../api/client';
import { setFakeApi } from '../test/fakeApi';
import type { FakeServer } from '../test/fakeServer';
import { createFakeServer } from '../test/fakeServer';
import { renderApp } from '../test/renderApp';

vi.mock('../api/useApi', () => import('../test/fakeApi'));

const data: GetAllData = {
  genres: [makeGenre({ genreId: 'g1' })],
  colors: [],
  brands: [makeBrand({ brandId: 'b1', name: '白牡丹', genreId: 'g1', servingAmount: 3 })],
  lots: [
    makeLot({
      lotId: 'soon',
      bestBefore: '2099-01-01',
      initialQty: 50,
      remainingQty: 10,
      version: 2,
    }),
    makeLot({ lotId: 'late', bestBefore: '2099-12-31', initialQty: 50, remainingQty: 40 }),
    makeLot({ lotId: 'used', initialQty: 50, remainingQty: 0, isDepleted: true, version: 3 }),
  ],
};

let server: FakeServer;

function useServer(initial: GetAllData) {
  server = createFakeServer(initial, [
    {
      historyId: 'd1',
      occurredAt: '2026-10-01T09:00:00+09:00',
      userEmail: 'taro@example.com',
      lotId: 'used',
      brandId: 'b1',
      delta: -4,
      servings: null,
      qtyAfter: 0,
      reason: 'DEPLETE',
      opId: 'op-d',
    },
  ]);
  setFakeApi((action, payload) => server.handle(action, payload));
}

const panelTarget = () => screen.getByText(/期限が近いロットから|指定したロット/).closest('div');

describe('SC-03 在庫の操作', () => {
  beforeEach(() => useServer(data));

  it('杯数を選んで「飲んだ」で消費し、完了を通知する', async () => {
    renderApp('/brands/b1');
    expect(await screen.findByText('最大3杯')).toBeDefined(); // 10g ÷ 3g
    fireEvent.click(screen.getByRole('button', { name: '1杯増やす' }));
    fireEvent.click(screen.getByRole('button', { name: '2杯飲んだ（6g）' }));

    expect(await screen.findByText('2杯飲みました（6g）')).toBeDefined();
    expect(server.requests).toEqual([
      { action: 'consume', payload: { brandId: 'b1', servings: 2 } },
    ]);
    await waitFor(() => expect(panelTarget()?.textContent).toContain('4g'));
  });

  it('杯数は1〜最大杯数の範囲で選ぶ', async () => {
    renderApp('/brands/b1');
    const dec = await screen.findByRole('button', { name: '1杯減らす' });
    const inc = screen.getByRole('button', { name: '1杯増やす' });
    expect(dec).toHaveProperty('disabled', true);
    fireEvent.click(inc);
    fireEvent.click(inc);
    expect(inc).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: '3杯飲んだ（9g）' })).toBeDefined();
  });

  it('「このロットから飲む」で指定したロットから消費する', async () => {
    renderApp('/brands/b1');
    const menus = await screen.findAllByRole('button', { name: 'ロットの操作' });
    fireEvent.click(menus[1] as HTMLElement); // 2番目（期限の遅いロット）
    fireEvent.click(await screen.findByRole('menuitem', { name: 'このロットから飲む' }));

    expect(await screen.findByText('指定したロット')).toBeDefined();
    expect(screen.getByText('最大13杯')).toBeDefined(); // 40g ÷ 3g
    // メニューが閉じ終わるまで、画面のほかの部分は操作対象外（aria-hidden）になるため待つ
    fireEvent.click(await screen.findByRole('button', { name: '1杯飲んだ（3g）' }));
    await waitFor(() =>
      expect(server.requests[0]).toEqual({
        action: 'consume',
        payload: { brandId: 'b1', servings: 1, lotId: 'late' },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: '指定を解除' }));
    expect(screen.getByText(/期限が近いロットから/)).toBeDefined();
  });

  it('量を指定して飲む。残量を超える量は入力エラー', async () => {
    renderApp('/brands/b1');
    fireEvent.click(await screen.findByRole('button', { name: '量を指定して飲んだ' }));
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByLabelText('使った量（g）');

    fireEvent.change(input, { target: { value: '10.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '飲んだ' }));
    expect(within(dialog).getByText('残量（10g）を超えています')).toBeDefined();

    fireEvent.change(input, { target: { value: '2.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '飲んだ' }));
    expect(await screen.findByText('2.5g飲みました')).toBeDefined();
    expect(server.requests[0]).toEqual({
      action: 'consume',
      payload: { brandId: 'b1', amount: 2.5 },
    });
  });

  it('残量が0になったら使い切りを確認し、使い切りにした後は「元に戻す」で取り消せる', async () => {
    useServer({ ...data, lots: [makeLot({ lotId: 'one', remainingQty: 3, version: 1 })] });
    renderApp('/brands/b1');
    fireEvent.click(await screen.findByRole('button', { name: '1杯飲んだ（3g）' }));

    const confirm = await screen.findByRole('dialog', { name: '使い切りにしますか？' });
    expect(within(confirm).getByText(/残量が0になりました/)).toBeDefined();
    fireEvent.click(within(confirm).getByRole('button', { name: '使い切りにする' }));

    expect(await screen.findByText('使い切りにしました')).toBeDefined();
    // 消費で版が上がった後の版番号で使い切りにする
    expect(server.requests[1]).toEqual({
      action: 'depleteLot',
      payload: { lotId: 'one', version: 2 },
    });

    // 確認ダイアログが閉じ終わるのを待ってから、通知の「元に戻す」を押す
    fireEvent.click(await screen.findByRole('button', { name: '元に戻す' }));
    expect(await screen.findByText('使い切りを取り消しました')).toBeDefined();
    expect(server.requests[2]).toEqual({
      action: 'restoreLot',
      payload: { lotId: 'one', version: 3 },
    });
  });

  it('1杯分に足りない場合は「残り全部使った」で使い切りにする', async () => {
    useServer({ ...data, lots: [makeLot({ lotId: 'tiny', remainingQty: 1.5, version: 4 })] });
    renderApp('/brands/b1');
    expect(await screen.findByText('1杯分（3g）に足りません')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '残り全部使った（1.5g）' }));
    expect(await screen.findByText('使い切りにしました')).toBeDefined();
    expect(server.requests[0]).toEqual({
      action: 'depleteLot',
      payload: { lotId: 'tiny', version: 4 },
    });
  });

  it('ロットの操作メニューから使い切りにする（確認あり）', async () => {
    renderApp('/brands/b1');
    fireEvent.click(
      (await screen.findAllByRole('button', { name: 'ロットの操作' }))[0] as HTMLElement,
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: '使い切りにする' }));
    const confirm = await screen.findByRole('dialog', { name: '使い切りにしますか？' });
    expect(within(confirm).getByText('残り10gを使い切りとして記録します。')).toBeDefined();
    fireEvent.click(within(confirm).getByRole('button', { name: '使い切りにする' }));
    expect(await screen.findByText('使い切りにしました')).toBeDefined();
    expect(server.requests[0]).toEqual({
      action: 'depleteLot',
      payload: { lotId: 'soon', version: 2 },
    });
  });

  it('使い切ったロットを「元に戻す」で取り消す', async () => {
    renderApp('/brands/b1');
    fireEvent.click(await screen.findByRole('button', { name: /使い切ったロット（1）/ }));
    fireEvent.click(screen.getByRole('button', { name: '元に戻す' }));
    expect(await screen.findByText('使い切りを取り消しました')).toBeDefined();
    expect(server.requests[0]).toEqual({
      action: 'restoreLot',
      payload: { lotId: 'used', version: 3 },
    });
    // 使い切りで減らした4gが戻る
    expect(await screen.findByText('ロット（3）')).toBeDefined();
  });

  it('エラーになったら画面を元に戻し、エラーを通知する', async () => {
    renderApp('/brands/b1');
    await screen.findByText('最大3杯');
    setFakeApi((action, payload) => {
      if (action === 'consume') {
        throw new ApiCallError('INSUFFICIENT_STOCK', ERROR_MESSAGES.INSUFFICIENT_STOCK);
      }
      return server.handle(action, payload);
    });
    fireEvent.click(screen.getByRole('button', { name: '1杯飲んだ（3g）' }));
    expect(await screen.findByText('残量が足りません')).toBeDefined();
    await waitFor(() => expect(panelTarget()?.textContent).toContain('10g'));
  });

  it('他の人が先に更新していたら（VERSION_CONFLICT）ダイアログで知らせる', async () => {
    renderApp('/brands/b1');
    fireEvent.click(
      (await screen.findAllByRole('button', { name: 'ロットの操作' }))[0] as HTMLElement,
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: '使い切りにする' }));
    // 確認している間に、他の人がこのロットを更新した
    server.data.lots = server.data.lots.map((l) => (l.lotId === 'soon' ? { ...l, version: 9 } : l));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: '使い切りにする' }),
    );
    expect(await screen.findByRole('dialog', { name: '他の人が更新しました' })).toBeDefined();
  });
});
