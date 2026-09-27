// 保守処理（詳細設計 6.6）。GAS エディタから手動で実行する。
import type { SheetName } from './repository/schema';
import { SHEETS } from './repository/schema';
import { toJstDateTime } from './repository/mapping';
import {
  appendBrands,
  appendColors,
  appendGenres,
  appendHistories,
  appendLots,
  ensureSheet,
  hasRows,
} from './repository';
import { buildSeedData } from './seed';
import { getAll } from './services/query';

/** 6シートを作成し、ヘッダーと書式を設定する（既存のデータは変更しない） */
export function setupSheets(): void {
  for (const name of Object.keys(SHEETS) as SheetName[]) {
    ensureSheet(name);
  }
  console.log('シートを準備しました');
}

/** 初期データ（色11件・ジャンル7件・銘柄14件・ロット14件と購入履歴）を投入する */
export function seedInitialData(): void {
  const targets: SheetName[] = ['colors', 'genres', 'brands', 'lots', 'stock_histories'];
  const filled = targets.filter((name) => hasRows(name));
  if (filled.length > 0) {
    // 二重投入を防ぐため、データが1件でもあれば何もしない
    throw new Error(`既にデータがあるため中止しました: ${filled.join(', ')}`);
  }
  const email = Session.getActiveUser().getEmail();
  const seed = buildSeedData(toJstDateTime(new Date()), email, () => Utilities.getUuid());
  appendColors(seed.colors);
  appendGenres(seed.genres);
  appendBrands(seed.brands);
  appendLots(seed.lots);
  appendHistories(seed.histories);
  SpreadsheetApp.flush();
  console.log(
    `初期データを投入しました：色${seed.colors.length}件、ジャンル${seed.genres.length}件、` +
      `銘柄${seed.brands.length}件、ロット${seed.lots.length}件、履歴${seed.histories.length}件`,
  );
}

/** getAll の結果をログに出す（動作確認用） */
export function checkGetAll(): void {
  const data = getAll();
  console.log(
    `ジャンル${data.genres.length}件、色${data.colors.length}件、` +
      `銘柄${data.brands.length}件、ロット${data.lots.length}件`,
  );
  console.log(JSON.stringify(data, null, 2));
}
