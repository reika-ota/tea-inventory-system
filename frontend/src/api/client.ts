// APIクライアント（詳細設計 7.2）
import type { Action, ApiError, ApiResponse, DataOf, ErrorCode, PayloadOf } from '@chaicoss/shared';
import { ERROR_MESSAGES, isMutationAction } from '@chaicoss/shared';
import type { AuthContextValue } from '../auth/AuthContext';

/** 通信できなかった場合のコード（GAS が返すエラーコードとは別に、画面側で使う） */
export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR';

const NETWORK_ERROR_MESSAGE = '通信できませんでした。電波の状態を確認して、もう一度お試しください';

/** API がエラーを返した、または通信できなかったことを表す */
export class ApiCallError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly current?: unknown,
  ) {
    super(message);
    this.name = 'ApiCallError';
  }

  static from(error: ApiError): ApiCallError {
    return new ApiCallError(error.code, error.message, error.fieldErrors, error.current);
  }
}

export type CallApi = <A extends Action>(
  action: A,
  payload: PayloadOf<A>,
  options?: { opId?: string },
) => Promise<DataOf<A>>;

export interface ApiClientOptions {
  url: string;
  auth: Pick<AuthContextValue, 'getIdToken' | 'refreshIdToken' | 'signOut'>;
  /** テストで差し替えるため */
  fetchFn?: typeof fetch;
  newOpId?: () => string;
}

export function createApiClient({
  url,
  auth,
  fetchFn = (...args) => fetch(...args),
  newOpId = () => crypto.randomUUID(),
}: ApiClientOptions): CallApi {
  /** トークンを取り直す。できなければログアウトしてログイン画面へ */
  async function refreshOrSignOut(): Promise<string> {
    try {
      return await auth.refreshIdToken();
    } catch {
      auth.signOut('expired');
      throw new ApiCallError('AUTH_INVALID_TOKEN', ERROR_MESSAGES.AUTH_INVALID_TOKEN);
    }
  }

  async function send(body: object): Promise<ApiResponse<unknown>> {
    try {
      // GAS はプリフライト（OPTIONS）に応答できないため text/plain で送る
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
      });
      return (await res.json()) as ApiResponse<unknown>; // GAS の応答（shared の型に従う）
    } catch {
      throw new ApiCallError('NETWORK_ERROR', NETWORK_ERROR_MESSAGE);
    }
  }

  return async function callApi<A extends Action>(
    action: A,
    payload: PayloadOf<A>,
    options: { opId?: string } = {},
  ): Promise<DataOf<A>> {
    // 更新系の opId は操作開始時に採番し、再送時も同じ値を使う（GAS 側で二重処理を防ぐ）
    const opId = isMutationAction(action) ? (options.opId ?? newOpId()) : undefined;
    const request = (idToken: string) => ({ action, idToken, payload, ...(opId && { opId }) });

    let response = await send(request(auth.getIdToken() ?? (await refreshOrSignOut())));
    // トークンの期限切れは、取り直して1回だけ再送する
    if (!response.ok && response.error.code === 'AUTH_INVALID_TOKEN') {
      response = await send(request(await refreshOrSignOut()));
    }
    if (response.ok) return response.data as DataOf<A>; // action に対応する data（shared の型に従う）

    const { code } = response.error;
    if (code === 'AUTH_FORBIDDEN') auth.signOut('forbidden');
    if (code === 'AUTH_INVALID_TOKEN') auth.signOut('expired');
    throw ApiCallError.from(response.error);
  };
}
