import type { Form } from '@chaicoss/shared';
import { MESSAGES, checkQuantity, toTenths } from '@chaicoss/shared';
import { formatQty } from '../format';

/** 入力値をチェックし、問題なければ数値、あればメッセージを返す（shared の入力チェックを使う） */
export function parseQuantity(
  text: string,
  form: Form,
  options: { max?: number; allowZero?: boolean } = {},
): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: MESSAGES.required };
  const checked = checkQuantity(Number(trimmed), form, { allowZero: options.allowZero });
  if (!checked.ok) return checked;
  if (options.max !== undefined && toTenths(checked.value) > toTenths(options.max)) {
    return { ok: false, error: `残量（${formatQty(options.max, form)}）を超えています` };
  }
  return checked;
}
