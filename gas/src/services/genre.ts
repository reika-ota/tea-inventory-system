// ジャンルマスタの更新（createGenre・updateGenre・deleteGenre）
import type {
  CreateGenrePayload,
  DeleteGenrePayload,
  Genre,
  UpdateGenrePayload,
} from '@chaicoss/shared';
import {
  checkGenreDeletable,
  checkGenreVersion,
  createGenre as createGenreRule,
  updateGenre as updateGenreRule,
} from '@chaicoss/shared';
import {
  appendGenres,
  deleteGenre as deleteGenreRow,
  readBrands,
  readColors,
  readGenres,
  updateGenre as updateGenreRow,
} from '../repository';
import type { MutationContext } from '../router';
import { unwrap, updateContext } from './common';

/** 色マスタの色コード（ジャンルの色の入力チェックに使う） */
export const colorCodes = (): string[] => readColors().map((c) => c.colorCode);

export function createGenre(input: CreateGenrePayload, ctx: MutationContext): Genre {
  const genre = unwrap(createGenreRule(readGenres(), input, updateContext(ctx)));
  appendGenres([genre]);
  return genre;
}

export function updateGenre(input: UpdateGenrePayload, ctx: MutationContext): Genre {
  const genres = readGenres();
  const genre = unwrap(
    checkGenreVersion(
      genres.find((g) => g.genreId === input.genreId),
      input.version,
    ),
  );
  const updated = unwrap(updateGenreRule(genre, genres, input, updateContext(ctx)));
  updateGenreRow(updated);
  return updated;
}

export function deleteGenre(input: DeleteGenrePayload): { genreId: string } {
  const genre = unwrap(
    checkGenreVersion(
      readGenres().find((g) => g.genreId === input.genreId),
      input.version,
    ),
  );
  unwrap(checkGenreDeletable(genre, readBrands()));
  deleteGenreRow(genre.genreId);
  return { genreId: genre.genreId };
}
