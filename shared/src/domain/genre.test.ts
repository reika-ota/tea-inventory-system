import { describe, expect, it } from 'vitest';
import { makeBrand, makeGenre } from '../test/fixtures';
import {
  checkGenreDeletable,
  checkGenreVersion,
  createGenre,
  isGenreInUse,
  updateGenre,
} from './genre';
import type { UpdateContext } from './result';

const ctx: UpdateContext = {
  userEmail: 'hanako@example.com',
  now: '2026-10-12T09:00:00+09:00',
  opId: 'op-1',
  newId: () => 'new-id',
};
const black = makeGenre({ genreId: 'g1', name: '紅茶', version: 2 });
const green = makeGenre({ genreId: 'g2', name: '緑茶' });
const genres = [black, green];

describe('createGenre', () => {
  it('ジャンルを作る（版番号1）', () => {
    expect(createGenre(genres, { name: '白茶', color: '#cdb97e', sortOrder: 3 }, ctx)).toEqual({
      ok: true,
      value: {
        genreId: 'new-id',
        name: '白茶',
        color: '#cdb97e',
        sortOrder: 3,
        version: 1,
        createdAt: ctx.now,
        createdBy: ctx.userEmail,
        updatedAt: ctx.now,
        updatedBy: ctx.userEmail,
      },
    });
  });

  it('同じ名前のジャンルがあれば GENRE_NAME_DUPLICATE', () => {
    expect(createGenre(genres, { name: '紅茶', color: '#000000', sortOrder: 3 }, ctx)).toEqual({
      ok: false,
      code: 'GENRE_NAME_DUPLICATE',
    });
  });
});

describe('updateGenre', () => {
  const input = {
    genreId: 'g1',
    version: 2,
    name: '紅茶（ダージリン）',
    color: '#4f7f9a',
    sortOrder: 5,
  };

  it('名前・色・表示順を書き換えて版番号を上げる', () => {
    const result = updateGenre(black, genres, input, ctx);
    expect(result.ok && result.value).toMatchObject({
      name: '紅茶（ダージリン）',
      color: '#4f7f9a',
      sortOrder: 5,
      version: 3,
      createdBy: black.createdBy,
      updatedBy: ctx.userEmail,
    });
  });

  it('名前を変えない（自分と同じ名前）のは重複ではない', () => {
    expect(updateGenre(black, genres, { ...input, name: '紅茶' }, ctx).ok).toBe(true);
  });

  it('他のジャンルと同じ名前は GENRE_NAME_DUPLICATE', () => {
    expect(updateGenre(black, genres, { ...input, name: '緑茶' }, ctx)).toMatchObject({
      ok: false,
      code: 'GENRE_NAME_DUPLICATE',
    });
  });
});

describe('checkGenreVersion', () => {
  it('版番号の確認', () => {
    expect(checkGenreVersion(black, 2)).toEqual({ ok: true, value: black });
    expect(checkGenreVersion(black, 1)).toEqual({
      ok: false,
      code: 'VERSION_CONFLICT',
      current: black,
    });
    expect(checkGenreVersion(undefined, 1)).toEqual({ ok: false, code: 'NOT_FOUND' });
  });
});

describe('削除', () => {
  it('参照する銘柄（削除済みを含む）があれば GENRE_IN_USE', () => {
    const brands = [makeBrand({ genreId: 'g1', isDeleted: true })];
    expect(isGenreInUse(black, brands)).toBe(true);
    expect(checkGenreDeletable(black, brands)).toMatchObject({ ok: false, code: 'GENRE_IN_USE' });
  });

  it('参照がなければ削除できる', () => {
    expect(checkGenreDeletable(green, [makeBrand({ genreId: 'g1' })])).toEqual({
      ok: true,
      value: green,
    });
  });
});
