import { APP_NAME } from '@chaicoss/shared';

/**
 * Webアプリの POST エントリ。
 * 雛形の段階では固定レスポンスを返す（認証・ルーティングは実装順序2以降で追加する）。
 */
export function doPost(_e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  const body = JSON.stringify({ ok: true, data: { app: APP_NAME } });
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
