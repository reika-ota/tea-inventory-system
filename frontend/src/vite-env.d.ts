/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** GAS Webアプリの URL（公開されても問題ない値） */
  readonly VITE_GAS_URL: string;
  /** Google OAuth クライアントID（公開されても問題ない値） */
  readonly VITE_OAUTH_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
