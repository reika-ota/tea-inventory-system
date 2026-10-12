import { createContext, useContext } from 'react';

export interface SnackbarAction {
  label: string;
  onClick(): void;
}

export interface FeedbackContextValue {
  /** 操作の完了を通知する（3秒表示。「元に戻す」などの操作付きは6秒表示。UI設計 1.10） */
  notify(message: string, action?: SnackbarAction): void;
  /** API のエラーを通知する（競合はダイアログ、それ以外はスナックバー） */
  notifyError(error: unknown): void;
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback(): FeedbackContextValue {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('FeedbackProvider の内側で使ってください');
  return value;
}
