// ジャンルマスタの更新の計算（詳細設計 3.3）。GAS の更新処理で使う純粋関数
import type { CreateGenrePayload, UpdateGenrePayload } from '../api';
import type { Brand, Genre } from '../types';
import type { DomainResult as Result, UpdateContext } from './result';
import { fail } from './result';

/** 同じ名前のジャンルがあるか（自分自身は除く） */
function nameTaken(genres: readonly Genre[], name: string, selfId: string | null): boolean {
  return genres.some((g) => g.name === name && g.genreId !== selfId);
}

/** ジャンルの存在と版番号を確認する（楽観ロック） */
export function checkGenreVersion(genre: Genre | undefined, version: number): Result<Genre> {
  if (!genre) return fail('NOT_FOUND');
  if (genre.version !== version) return fail('VERSION_CONFLICT', genre);
  return { ok: true, value: genre };
}

/** ジャンルの追加。名前が重複していれば GENRE_NAME_DUPLICATE（色は入力チェックで確認済み） */
export function createGenre(
  genres: readonly Genre[],
  input: CreateGenrePayload,
  ctx: UpdateContext,
): Result<Genre> {
  if (nameTaken(genres, input.name, null)) return fail('GENRE_NAME_DUPLICATE');
  return {
    ok: true,
    value: {
      genreId: ctx.newId(),
      name: input.name,
      color: input.color,
      sortOrder: input.sortOrder,
      version: 1,
      createdAt: ctx.now,
      createdBy: ctx.userEmail,
      updatedAt: ctx.now,
      updatedBy: ctx.userEmail,
    },
  };
}

/** ジャンルの編集（名前・色・表示順）。名前が重複していれば GENRE_NAME_DUPLICATE */
export function updateGenre(
  genre: Genre,
  genres: readonly Genre[],
  input: UpdateGenrePayload,
  ctx: UpdateContext,
): Result<Genre> {
  if (nameTaken(genres, input.name, genre.genreId)) return fail('GENRE_NAME_DUPLICATE', genre);
  return {
    ok: true,
    value: {
      ...genre,
      name: input.name,
      color: input.color,
      sortOrder: input.sortOrder,
      version: genre.version + 1,
      updatedAt: ctx.now,
      updatedBy: ctx.userEmail,
    },
  };
}

/** ジャンルを参照している銘柄（削除済みを含む）があるか */
export function isGenreInUse(genre: Genre, brands: readonly Brand[]): boolean {
  return brands.some((b) => b.genreId === genre.genreId);
}

/**
 * ジャンルの削除の確認。参照する銘柄（削除済み含む）があれば GENRE_IN_USE。
 * ジャンルには論理削除の列がなく、参照がないことを確認してから行を削除する
 */
export function checkGenreDeletable(genre: Genre, brands: readonly Brand[]): Result<Genre> {
  if (isGenreInUse(genre, brands)) return fail('GENRE_IN_USE', genre);
  return { ok: true, value: genre };
}
