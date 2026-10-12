// GAS のエントリ。ここで export した関数は、バンドル後にトップレベルの関数として出力される
// （doPost はWebアプリの入口、その他は GAS エディタやトリガーから実行する保守処理）。
import { validateConsume, validateLotVersion } from '@chaicoss/shared';
import { authenticate } from './auth';
import { runIdempotent } from './idempotency';
import { withLock } from './lock';
import { createRouter, parseWith } from './router';
import { getAll, getHistories } from './services/query';
import { consume, depleteLot, restoreLot } from './services/stock';

export {
  checkAuthSettings,
  checkGetAll,
  installTriggers,
  purgeOperations,
  seedInitialData,
  setupSheets,
} from './maintenance';

const handle = createRouter(
  {
    getAll: () => getAll(),
    getHistories: (payload) => getHistories(payload),
    // 量の形式は茶葉の条件（ティーバッグの条件を含む）で確認し、形態による違いは処理の中で確認する
    consume: { parse: parseWith((p) => validateConsume(p, 'LEAF')), run: consume },
    depleteLot: { parse: parseWith(validateLotVersion), run: depleteLot },
    restoreLot: { parse: parseWith(validateLotVersion), run: restoreLot },
  },
  {
    authenticate,
    runMutation: (op, process) => withLock(() => runIdempotent(op, process)),
  },
);

/** Webアプリの POST エントリ（詳細設計 6.1）。GAS は常に HTTP 200 を返す */
export function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  const response = handle(e.postData?.contents ?? '');
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
