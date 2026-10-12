// SC-05 購入登録
import type { GetAllData } from '@chaicoss/shared';
import { toJstDate } from '@chaicoss/shared';
import { makeBrand, makeGenre, makeLot } from '@chaicoss/shared/testing';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setFakeApi } from '../test/fakeApi';
import type { FakeServer } from '../test/fakeServer';
import { createFakeServer } from '../test/fakeServer';
import { renderApp } from '../test/renderApp';

vi.mock('../api/useApi', () => import('../test/fakeApi'));

const data: GetAllData = {
  genres: [makeGenre({ genreId: 'g1', name: '紅茶' })],
  colors: [],
  brands: [
    makeBrand({ brandId: 'leaf', name: 'ウバ', genreId: 'g1', servingAmount: 3 }),
    makeBrand({ brandId: 'bag', name: 'JAFTEA', genreId: 'g1', form: 'BAG', servingAmount: 1 }),
    makeBrand({ brandId: 'gone', name: '削除済み', genreId: 'g1', isDeleted: true }),
  ],
  lots: [
    makeLot({ lotId: 'old', brandId: 'leaf', initialQty: 100, purchasedOn: '2026-01-01' }),
    makeLot({ lotId: 'new', brandId: 'leaf', initialQty: 50, purchasedOn: '2026-08-01' }),
  ],
};

let server: FakeServer;
const today = toJstDate(new Date());

describe('SC-05 購入登録', () => {
  beforeEach(() => {
    server = createFakeServer(data);
    setFakeApi((action, payload) => server.handle(action, payload));
  });

  it('前回の購入量・当日を初期値とし、杯数と既存のロットを案内する', async () => {
    renderApp('/brands/leaf/purchase');
    const qty = await screen.findByLabelText<HTMLInputElement>(/購入量（g）/);
    expect(qty.value).toBe('50');
    expect(screen.getByText('＝16杯分')).toBeDefined(); // 50g ÷ 3g
    expect(screen.getByLabelText<HTMLInputElement>(/購入日/).value).toBe(today);
    expect(
      screen.getByText('在庫が2ロットあります。今回の購入は別のロットとして登録します。'),
    ).toBeDefined();
    expect(screen.getByText('ウバ')).toBeDefined();
  });

  it('登録すると銘柄詳細に戻り、完了を通知する', async () => {
    renderApp('/brands/leaf/purchase');
    const qty = await screen.findByLabelText(/購入量（g）/);
    fireEvent.change(qty, { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText(/賞味期限/), { target: { value: '2027-06-30' } });
    fireEvent.click(screen.getByRole('button', { name: '購入を登録' }));

    expect(await screen.findByText('購入を登録しました')).toBeDefined();
    expect(await screen.findByRole('heading', { name: 'ウバ' })).toBeDefined();
    expect(server.requests).toEqual([
      {
        action: 'receiveLot',
        payload: { brandId: 'leaf', qty: 80, bestBefore: '2027-06-30', purchasedOn: today },
      },
    ]);
    expect(await screen.findByText('ロット（3）')).toBeDefined();
  });

  it('入力エラーは項目の下に表示し、登録しない', async () => {
    renderApp('/brands/bag/purchase');
    const qty = await screen.findByLabelText(/購入量（個）/);
    expect((qty as HTMLInputElement).value).toBe(''); // 初回は空欄
    fireEvent.change(qty, { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText(/購入日/), { target: { value: '2999-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: '購入を登録' }));

    expect(await screen.findByText('1〜9999の整数で入力してください')).toBeDefined();
    expect(screen.getByText('今日以前の日付を入力してください')).toBeDefined();
    expect(server.requests).toEqual([]);
  });

  it('賞味期限は「クリア」で空欄に戻せる', async () => {
    renderApp('/brands/leaf/purchase');
    const bb = await screen.findByLabelText<HTMLInputElement>(/賞味期限/);
    fireEvent.change(bb, { target: { value: '2027-06-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'クリア' }));
    expect(bb.value).toBe('');
  });

  it('削除した銘柄には登録できない', async () => {
    renderApp('/brands/gone/purchase');
    expect(await screen.findByText('銘柄が見つかりません')).toBeDefined();
  });

  it('SC-03 の「買い足し」、在庫なしの「再購入」から開ける', async () => {
    renderApp('/brands/leaf');
    const link = await screen.findByRole('link', { name: '買い足し' });
    expect(link.getAttribute('href')).toBe('/brands/leaf/purchase');
  });

  it('在庫がない銘柄の SC-03 には「再購入を登録」、SC-02 には「再購入」を表示する', async () => {
    renderApp('/brands/bag');
    expect((await screen.findByRole('link', { name: '再購入を登録' })).getAttribute('href')).toBe(
      '/brands/bag/purchase',
    );
  });

  it('SC-02 の在庫なし枠から再購入できる', async () => {
    renderApp('/');
    const section = (await screen.findByText('在庫なし（1）')).nextElementSibling as HTMLElement;
    expect(within(section).getByRole('link', { name: '再購入' }).getAttribute('href')).toBe(
      '/brands/bag/purchase',
    );
  });
});
