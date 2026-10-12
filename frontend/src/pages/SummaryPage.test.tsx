// SC-06 ジャンル別集計
import type { GetAllData } from '@chaicoss/shared';
import { makeBrand, makeGenre, makeLot } from '@chaicoss/shared/testing';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setFakeApi } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';

vi.mock('../api/useApi', () => import('../test/fakeApi'));

const data: GetAllData = {
  genres: [
    makeGenre({ genreId: 'green', name: '緑茶', sortOrder: 2 }),
    makeGenre({ genreId: 'black', name: '紅茶', sortOrder: 1 }),
    makeGenre({ genreId: 'white', name: '白茶', sortOrder: 3 }),
  ],
  colors: [],
  brands: [
    makeBrand({ brandId: 'uba', name: 'ウバ', genreId: 'black' }),
    makeBrand({ brandId: 'jaf', name: 'JAFTEA', genreId: 'black', form: 'BAG', servingAmount: 1 }),
    makeBrand({ brandId: 'uji', name: '宇治', genreId: 'green' }),
    makeBrand({ brandId: 'gone', name: '白牡丹', genreId: 'white' }),
  ],
  lots: [
    makeLot({ brandId: 'uba', remainingQty: 12.5 }),
    makeLot({ brandId: 'uba', remainingQty: 8 }),
    makeLot({ brandId: 'jaf', remainingQty: 5 }),
    makeLot({ brandId: 'uji', remainingQty: 41 }),
    makeLot({ brandId: 'gone', remainingQty: 0, isDepleted: true }),
  ],
};

beforeEach(() => setFakeApi(() => data));

/** ジャンルの行（タップで在庫一覧へ移るリンク） */
const genreRow = (name: string) => screen.getByText(name).closest('a') as HTMLElement;

describe('SC-06 ジャンル別集計', () => {
  it('合計：在庫のある銘柄数、茶葉の合計（g）、ティーバッグの合計（個）', async () => {
    renderApp('/summary');
    expect(await screen.findByText('在庫のある銘柄')).toBeDefined();
    const stats = screen.getByText('在庫のある銘柄').parentElement?.parentElement as HTMLElement;
    expect(stats.textContent).toContain('3在庫のある銘柄');
    expect(stats.textContent).toContain('61.5g茶葉の合計'); // 12.5 + 8 + 41
    expect(stats.textContent).toContain('5個ティーバッグの合計');
  });

  it('全ジャンルを表示順に、銘柄数と形態別の合計を表示する', async () => {
    renderApp('/summary');
    await screen.findByText('ジャンル別');
    const names = screen.getAllByRole('link').map((a) => a.textContent ?? '');
    expect(names.filter((t) => /紅茶|緑茶|白茶/.test(t)).map((t) => t.slice(0, 2))).toEqual([
      '紅茶',
      '緑茶',
      '白茶',
    ]);
    const black = genreRow('紅茶');
    expect(within(black).getByText('2銘柄')).toBeDefined();
    expect(black.textContent).toContain('茶葉 20.5g');
    expect(black.textContent).toContain('ティーバッグ 5個');
  });

  it('在庫のないジャンルは薄く表示し、タップできない', async () => {
    renderApp('/summary');
    await screen.findByText('ジャンル別');
    const white = genreRow('白茶');
    expect(within(white).getByText('在庫なし')).toBeDefined();
    expect(white.getAttribute('aria-disabled')).toBe('true');
  });

  it('ジャンルをタップすると、在庫一覧をそのジャンルで絞り込んで表示する', async () => {
    renderApp('/summary');
    await screen.findByText('ジャンル別');
    fireEvent.click(genreRow('緑茶'));
    expect(await screen.findByText('1銘柄を表示')).toBeDefined();
    expect(screen.getByRole('button', { name: /緑茶 1/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('下部タブで集計が選択されている', async () => {
    renderApp('/summary');
    const nav = await screen.findByRole('navigation');
    expect(within(nav).getByRole('link', { name: '集計' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });
});
