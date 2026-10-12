/**
 * 確定時、最初のエラーの項目までスクロールし、入力欄にフォーカスする（UI設計 1.10）。
 * 入力欄の id は項目名と同じにしておくこと
 */
export function focusFirstError(
  order: readonly string[],
  fieldErrors: Record<string, string>,
): void {
  const first = order.find((field) => fieldErrors[field]);
  if (!first) return;
  const element = document.getElementById(first);
  element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  element?.focus();
}
