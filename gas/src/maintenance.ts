// 保守処理（詳細設計 6.6）。GAS エディタから手動で実行する。
import { toJstDateTime } from '@chaicoss/shared';
import type { SheetName } from './repository/schema';
import { SHEETS } from './repository/schema';
import {
  appendBrands,
  appendColors,
  appendGenres,
  appendHistories,
  appendLots,
  deleteOperationsBefore,
  ensureSheet,
  hasRows,
} from './repository';
import { describeAuthSettings } from './auth';
import { withLock } from './lock';
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

/** 操作ログを残す日数 */
const OPERATION_RETENTION_DAYS = 30;

/** 30日より古い操作ログ（operations）を削除する（時間主導トリガーで毎日実行） */
export function purgeOperations(): void {
  const before = toJstDateTime(new Date(Date.now() - OPERATION_RETENTION_DAYS * 86_400_000));
  const deleted = withLock(() => deleteOperationsBefore(before));
  console.log(`${before} より前の操作ログを ${deleted} 件削除しました`);
}

/**
 * purgeOperations を毎日実行するトリガーを設定する（初回に GAS エディタから1回実行する）。
 * 何度実行しても、トリガーは1つだけになる。
 */
export function installTriggers(): void {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === 'purgeOperations') ScriptApp.deleteTrigger(trigger);
  }
  ScriptApp.newTrigger('purgeOperations').timeBased().everyDays(1).atHour(3).create();
  console.log('purgeOperations を毎日3時台に実行するトリガーを設定しました');
}

/**
 * 認証の設定状況をログに出す（動作確認用）。
 * 外部への通信（UrlFetchApp）を含むため、初回の実行時にその権限の承認を求められる。
 * Webアプリは承認済みの権限で動くため、認証を追加した後に一度実行しておく。
 */
export function checkAuthSettings(): void {
  console.log(describeAuthSettings());
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=invalid', {
    muteHttpExceptions: true,
  });
  console.log(`tokeninfo への接続：HTTP ${res.getResponseCode()}（400 なら正常）`);
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
