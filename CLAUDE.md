# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code 向けのプロジェクト説明と開発ルールです。

## プロジェクト概要

**Chaicoss** は、家庭にあるお茶（茶葉・ティーバッグ）の残量と賞味期限を、家族で共有して管理する個人用Webアプリです。

- 利用者：オーナーと家族の数名のみ（一般公開しない）
- 目的：在庫管理に加え、要件定義〜テストの開発工程と、在庫管理システムの整合性の仕組み（マスタ／ロット、差分更新、排他制御、楽観ロック、冪等性、履歴）を学ぶこと
- オーナーはReact未経験（設計・インフラ・他言語の経験は豊富）

## 設計書（最優先の参照先）

実装はすべて `docs/` の設計書に従う。

| ファイル | 内容 |
|---|---|
| `docs/01_requirements.md` | 要件定義（FR-xx／NFR-xx） |
| `docs/02_tech_selection.md` | 技術選定 |
| `docs/03_basic_design.md` | 基本設計（構成、画面一覧、データ、API一覧、業務ルール） |
| `docs/04_detail_design.md` | 詳細設計（型、API仕様、エラーコード、入力チェック、実装順序） |
| `docs/05_ui_design.md` | UI設計（共通デザイン、画面別仕様、表示文言） |
| `docs/ui/wireframe.html` | 画面モック（見た目の基準） |

- 設計書同士、または設計書と実装が食い違う場合は、推測で埋めずにオーナーに確認する
- 設計を変える必要があるときは、**先に設計書を更新してから実装する**。更新時は版番号を上げ、関連する設計書の「前提資料」の版も合わせる
- 設計書にない判断をした場合は、作業報告で明示する

## 技術スタック

- 言語：TypeScript（strict）で統一
- フロントエンド：React＋Vite、MUI、@mui/icons-material、React Router（HashRouter）、TanStack Query
- API：Google Apps Script（Webアプリ、スプレッドシートにバインド）
- データストア：Google スプレッドシート
- 認証：Google Identity Services（@react-oauth/google）＋GAS側でIDトークン検証
- ホスティング：GitHub Pages（GitHub Actionsでデプロイ）
- GASのビルド：Rollupでバンドル → clasp push
- テスト：Vitest
- 静的解析：ESLint＋Prettier

## リポジトリ構成

npm workspaces によるモノレポ。詳細は `docs/04_detail_design.md` の「1. ディレクトリ構成」を参照。

```
frontend/  React アプリ（GitHub Pages）
gas/       GAS API
shared/    API型定義・ドメインロジック・入力チェック（frontend と gas の両方から参照）
docs/      設計書
```

## コマンド

Node.js 24（`.nvmrc`）を使用する。すべてリポジトリのルートで実行する。

```bash
npm install              # 依存関係のインストール（CI では npm ci）
npm run lint             # 静的解析（ESLint）
npm run format           # 整形（Prettier）。CI では npm run format:check
npm run typecheck        # 型チェック（全ワークスペース）
npm test                 # 単体テスト（Vitest、全ワークスペース）
npm run test:watch       # 単体テスト（監視モード）
npm run build            # gas と frontend のビルド
npm run dev -w frontend  # 開発サーバー
npm run build -w frontend
npm run build -w gas     # gas/dist/Code.js と appsscript.json を生成
npm run push -w gas      # ビルドして clasp push（GAS エディタ上のコードのみ更新）
npm run deploy -w gas    # push して既存のWebアプリのデプロイを更新（URL は変わらない）
```

CI（`.github/workflows/ci.yml`）は PR と main への push で lint・整形チェック・型チェック・テスト・ビルドを実行する。

## 開発の進め方

- `docs/04_detail_design.md` の「8. 実装順序」に沿って、1ステップずつ進める
- 1ステップ＝1ブランチ＝1プルリクエストを基本とし、完了条件を満たしたことを確認してから次へ進む
- 各ステップの最後に、変更内容・確認方法・設計書にない判断を日本語で報告する
- オーナーはReact未経験のため、Reactに特有の書き方（フック、TanStack Query、MUIの使い方など）を初めて使うときは、報告の中で短く説明する

## 実装ルール

### 共通
- `any` は使わない。やむを得ない場合は理由をコメントに書く
- 識別子は英語、コメントは日本語
- コミットメッセージは `feat:` `fix:` `docs:` `test:` `refactor:` `chore:` の接頭辞を付け、本文は日本語で書く
- 新しい依存パッケージを追加する場合は、報告で理由を説明する

### shared
- API のリクエスト／レスポンス型、エラーコードは `shared/src/api` に定義し、frontend と gas の両方から参照する。API を変えるときは、まずここを変える
- 引当、残り杯数、強調判定、集計、入力チェックなどのロジックは、GAS やブラウザの API に依存しない純粋関数として `shared` に置き、Vitest で単体テストを書く
- 茶葉の数量は内部で0.1g単位の整数（×10）で計算し、小数の誤差を避ける

### gas
- スプレッドシートの読み書きは `gas/src/repository` だけで行う
- 更新系の action は、必ず「認証 → 入力チェック → ロック取得 → op_id確認 → 版確認 → 処理 → 履歴・操作ログ記録 → ロック解放」の流れ（詳細設計 6.3）を通す。この流れを迂回しない
- 在庫の増減は差分で処理し、すべて stock_histories に記録する
- 日付・日時・UUIDの列は書式なしテキストとして扱う

### frontend
- 見た目と文言は `docs/05_ui_design.md` と `docs/ui/wireframe.html` に従う
- 画面上の文言は「1.8 表示文言の統一」に従う（例：「入庫」ではなく「購入」、「1回分」ではなく「1杯」）
- アイコンは Material Icons（@mui/icons-material）のみを使う。適切なものがない場合は、独自に作る前にオーナーに確認する
- サーバーのデータは TanStack Query で管理し、グローバル状態管理ライブラリは導入しない
- IDトークンはメモリ上だけに保持し、localStorage などには保存しない

## セキュリティ（公開リポジトリ）

このリポジトリは GitHub Pages のために公開（public）になっている。

- 許可メールアドレス、認証情報、個人のメールアドレスをコード・設定ファイル・コミットに含めない
- 許可メールアドレスと OAuth クライアントID（検証用）は GAS のスクリプトプロパティに保存する
- `.clasprc.json`（clasp の認証情報）は絶対にコミットしない
- フロントエンドの環境変数（`VITE_GAS_URL`、`VITE_OAUTH_CLIENT_ID`）は公開されても問題ない値だけにする

## やってはいけないこと

- 設計書を更新せずに、仕様・データ構造・APIを変える
- `docs/ui/wireframe.html` を、依頼なしに変更する
- 本番のスプレッドシートのデータを、確認なしに削除・一括変更する
