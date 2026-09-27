/** 履歴の操作者表示：メールアドレスの@より前（例：taro@example.com → taro） */
export function displayUserName(email: string): string {
  const at = email.indexOf('@');
  return at < 0 ? email : email.slice(0, at);
}
