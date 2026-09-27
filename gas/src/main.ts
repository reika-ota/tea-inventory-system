import { APP_NAME } from '@chaicoss/shared';

/**
 * Webアプリの POST エントリ。
 * スパイク（実装順序2）の段階では、受け取った action をそのまま返す固定レスポンスとする。
 * 認証・ルーティングは実装順序4・5で追加する。
 */
export function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  const body = JSON.stringify({
    ok: true,
    data: { app: APP_NAME, receivedAction: readAction(e.postData?.contents) },
  });
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

/** リクエスト本文（JSON文字列）から action を取り出す。読めなければ null */
function readAction(contents: string | undefined): string | null {
  if (!contents) return null;
  try {
    const parsed: unknown = JSON.parse(contents);
    if (typeof parsed === 'object' && parsed !== null && 'action' in parsed) {
      return typeof parsed.action === 'string' ? parsed.action : null;
    }
    return null;
  } catch {
    return null;
  }
}
