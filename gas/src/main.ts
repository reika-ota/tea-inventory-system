// GAS のエントリ。ここで export した関数は、バンドル後にトップレベルの関数として出力される
// （doPost はWebアプリの入口、その他は GAS エディタから実行する保守処理）。
import { authenticate } from './auth';
import { createRouter } from './router';
import { getAll } from './services/query';

export { checkAuthSettings, checkGetAll, seedInitialData, setupSheets } from './maintenance';

const handle = createRouter(
  {
    getAll: () => getAll(),
  },
  authenticate,
);

/** Webアプリの POST エントリ（詳細設計 6.1）。GAS は常に HTTP 200 を返す */
export function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  const response = handle(e.postData?.contents ?? '');
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
