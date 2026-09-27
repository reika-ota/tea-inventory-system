# Chaicoss（お茶在庫管理アプリ） 詳細設計書

| 項目 | 内容 |
|---|---|
| 版 | 1.4 |
| 作成日 | 2026-09-26（v1.4：2026-09-27） |
| フェーズ | 詳細設計 |
| 前提資料 | 01_requirements.md（v1.4）、02_tech_selection.md（v1.3）、03_basic_design.md（v1.2）、05_ui_design.md（v1.1） |

本書はClaude Codeによる実装の入力資料とする。実装中に判明した事項は本書を更新してから反映する。

---

## 1. ディレクトリ構成

npm workspaces によるモノレポとする。

```
tea-inventory-system/
├── CLAUDE.md
├── package.json              # workspaces: frontend, gas, shared
├── .github/workflows/
│   ├── ci.yml                # lint・型チェック・テスト（PR時）
│   └── deploy-pages.yml      # frontend ビルド → GitHub Pages（main push時）
├── docs/                     # 01〜06 設計書
│   └── ui/wireframe.html     # 画面モック
├── shared/
│   └── src/
│       ├── types/            # エンティティ型・列挙型
│       ├── api/              # API リクエスト/レスポンス型、エラーコード
│       ├── domain/           # 引当・残り回数・強調判定・集計（純粋関数）
│       ├── validation/       # 入力チェック（フロント・GAS共用）
│       └── constants.ts      # 閾値・既定値
├── gas/
│   ├── appsscript.json       # timeZone: Asia/Tokyo, runtime: V8
│   ├── .clasp.json
│   ├── rollup.config.mjs
│   └── src/
│       ├── main.ts           # doPost エントリ
│       ├── router.ts         # action → handler
│       ├── auth.ts           # IDトークン検証・許可メール照合
│       ├── lock.ts           # LockService ラッパー
│       ├── idempotency.ts    # operations シート操作
│       ├── repository/       # シートごとの読み書き
│       ├── services/         # 業務処理（genre, brand, lot, stock）
│       └── maintenance.ts    # 初期データ投入・ログ削除
└── frontend/
    ├── vite.config.ts        # base: '/tea-inventory-system/'（GitHub リポジトリ名）
    └── src/
        ├── main.tsx
        ├── App.tsx           # ルーティング・認証ガード
        ├── api/              # APIクライアント・TanStack Query フック
        ├── auth/             # Googleログイン
        ├── pages/            # SC-01〜SC-07
        ├── components/       # 共通部品
        └── theme.ts          # MUI テーマ
```

---

## 2. 型定義（shared/types）

```ts
export type Uuid = string;
export type IsoDateTime = string; // 例: 2026-09-26T21:30:00+09:00
export type IsoDate = string;     // 例: 2026-09-26

export type Form = 'LEAF' | 'BAG';
export type StockReason = 'IN' | 'CONSUME' | 'ADJUST' | 'DEPLETE' | 'RESTORE';

export interface Audit {
  version: number;
  createdAt: IsoDateTime;
  createdBy: string;
  updatedAt: IsoDateTime;
  updatedBy: string;
}

export interface Genre extends Audit {
  genreId: Uuid;
  name: string;
  color: string;      // #rrggbb
  sortOrder: number;
}

export interface ColorOption {
  colorCode: string;  // #rrggbb
  name: string;
  sortOrder: number;
}

export interface Brand extends Audit {
  brandId: Uuid;
  name: string;
  genreId: Uuid;
  flavors: string[];
  form: Form;
  servingAmount: number;
  shop: string | null;
  memo: string | null;
  isDeleted: boolean;
  deletedAt: IsoDateTime | null;
}

export interface Lot extends Audit {
  lotId: Uuid;
  brandId: Uuid;
  initialQty: number;
  remainingQty: number;
  bestBefore: IsoDate | null;
  purchasedOn: IsoDate;
  isDepleted: boolean;
  depletedAt: IsoDateTime | null;
}

export interface StockHistory {
  historyId: Uuid;
  occurredAt: IsoDateTime;
  userEmail: string;
  lotId: Uuid;
  brandId: Uuid;
  delta: number;
  servings: number | null;
  qtyAfter: number;
  reason: StockReason;
  opId: Uuid;
}
```

シートの列名（snake_case）と型のプロパティ名（camelCase）の変換は gas/repository で行う。

---

## 3. API詳細

### 3.1 共通型

```ts
export interface ApiRequest<A extends Action, P> {
  action: A;
  idToken: string;
  opId?: Uuid;   // 更新系は必須
  payload: P;
}

export type ApiResponse<D> =
  | { ok: true; data: D }
  | { ok: false; error: ApiError };

export interface ApiError {
  code: ErrorCode;
  message: string;                       // 利用者向け日本語メッセージ
  fieldErrors?: Record<string, string>;  // VALIDATION_ERROR 時
  current?: unknown;                     // VERSION_CONFLICT 時の最新データ
}
```

- GASは常にHTTP 200を返すため、成否は `ok` で判定する
- 更新系は、更新後のエンティティ（または関連エンティティ一式）を返す

### 3.2 action別仕様

| action | payload | data |
|---|---|---|
| getAll | `{}` | `{ genres: Genre[]; colors: ColorOption[]; brands: Brand[]; lots: Lot[] }` |
| getHistories | `{ brandId }` | `StockHistory[]`（新しい順） |
| createGenre | `{ name, color, sortOrder }` | `Genre` |
| updateGenre | `{ genreId, version, name, color, sortOrder }` | `Genre` |
| deleteGenre | `{ genreId, version }` | `{ genreId }` |
| createBrand | `{ name, genreId, flavors, form, servingAmount, shop?, memo? }` | `Brand` |
| updateBrand | `{ brandId, version, …createBrandと同項目 }` | `Brand` |
| deleteBrand | `{ brandId, version }` | `Brand` |
| restoreBrand | `{ brandId, version }` | `Brand` |
| receiveLot | `{ brandId, qty, bestBefore?, purchasedOn }` | `Lot` |
| consume | `{ brandId, lotId?, servings? , amount? }` | `{ lot: Lot; history: StockHistory }` |
| adjustLot | `{ lotId, version, remainingQty }` | `{ lot: Lot; history: StockHistory | null }`（変更なしの場合 history は null） |
| updateLot | `{ lotId, version, bestBefore?, purchasedOn }` | `Lot` |
| depleteLot | `{ lotId, version }` | `{ lot: Lot; history: StockHistory }` |
| restoreLot | `{ lotId, version }` | `{ lot: Lot; history: StockHistory }` |

### 3.3 action別の業務処理

| action | 処理 |
|---|---|
| deleteGenre | 参照する銘柄（削除済み含む）があれば GENRE_IN_USE |
| createGenre / updateGenre | 名前重複は GENRE_NAME_DUPLICATE。color が colors に存在しなければ VALIDATION_ERROR |
| deleteBrand | 有効ロットがあれば BRAND_HAS_ACTIVE_LOTS |
| createBrand / updateBrand / restoreBrand | ジャンルが存在しなければ NOT_FOUND |
| updateBrand | form の変更は有効ロットがある場合 BRAND_HAS_ACTIVE_LOTS（単位が変わるため） |
| receiveLot | 削除済み銘柄への購入登録は NOT_FOUND。IN履歴（delta＝qty）を記録 |
| consume | 下記3.4参照 |
| adjustLot | delta＝新残量−現残量。0の場合も記録しない（変更なしとして正常終了）。使い切りロットは LOT_DEPLETED |
| depleteLot | delta＝−現残量、残量0、is_depleted＝true。DEPLETE履歴を記録。使い切り済みは LOT_DEPLETED |
| restoreLot | 最新のDEPLETE履歴の delta の符号を反転した量を残量に戻し、is_depleted＝false。RESTORE履歴を記録。使い切りでない場合は LOT_NOT_DEPLETED |

### 3.4 consume の処理

1. servings と amount の両方指定 → VALIDATION_ERROR。両方省略 → servings＝1
2. 銘柄が存在しない／削除済み → NOT_FOUND
3. lotId 指定あり：そのロット（同一銘柄・有効であること）。指定なし：引当ルールで1ロット選択。有効ロットなし → NO_ACTIVE_LOT
4. servings 指定時 amount ＝ servingAmount（最新マスタ）× servings
5. amount ＞ remainingQty → INSUFFICIENT_STOCK（`current` に対象ロットを返す）
6. remainingQty −＝ amount、version＋1、CONSUME履歴（servings を記録）
7. 残量0になってもロットは使い切りにしない（フロントエンドが確認後に depleteLot を呼ぶ）

「残り全部使った」は consume ではなく depleteLot を呼ぶ。

### 3.5 エラーコード

| code | 区分 | 利用者向けメッセージ（例） |
|---|---|---|
| AUTH_INVALID_TOKEN | 認証 | ログインの有効期限が切れました |
| AUTH_FORBIDDEN | 認可 | このアカウントは利用できません |
| UNKNOWN_ACTION | 入力 | 不正な操作です |
| VALIDATION_ERROR | 入力 | 入力内容を確認してください |
| OP_ID_MISMATCH | 入力 | 不正な操作です（同一op_idで別action） |
| NOT_FOUND | 対象なし | 対象のデータが見つかりません |
| VERSION_CONFLICT | 競合 | 他の人が更新しました。最新の内容を確認してください |
| INSUFFICIENT_STOCK | 業務 | 残量が足りません |
| NO_ACTIVE_LOT | 業務 | 在庫がありません |
| GENRE_IN_USE | 業務 | このジャンルは使用中のため削除できません |
| GENRE_NAME_DUPLICATE | 業務 | 同じ名前のジャンルがあります |
| BRAND_HAS_ACTIVE_LOTS | 業務 | 在庫が残っているため操作できません |
| LOT_DEPLETED | 業務 | このロットは使い切り済みです |
| LOT_NOT_DEPLETED | 業務 | このロットは使い切りになっていません |
| LOCK_TIMEOUT | ロック | 混み合っています。もう一度お試しください |
| INTERNAL_ERROR | システム | エラーが発生しました |

---

## 4. 入力チェック（shared/validation）

| 項目 | ルール |
|---|---|
| ジャンル名 | 必須、1〜20文字、前後空白除去 |
| 表示順 | 必須、0以上の整数 |
| ジャンルの色 | 必須、colors に存在する色コード |
| 銘柄名 | 必須、1〜50文字、前後空白除去 |
| フレーバー | 各要素1〜20文字、最大10個、重複不可 |
| 形態 | LEAF / BAG |
| 1回分の量 | 必須、LEAF：0.1〜100（小数第1位まで）、BAG：1固定（入力なし） |
| 購入店・メモ | 任意、購入店50文字・メモ200文字まで |
| 購入量・残量・消費量 | LEAF：0.1〜9999（小数第1位まで）、BAG：1〜9999の整数。残量のみ0を許容 |
| 杯数 | 1〜99の整数 |
| 賞味期限 | 任意、`YYYY-MM-DD` の実在日付 |
| 購入日 | 必須、`YYYY-MM-DD` の実在日付、当日以前 |

- 小数の計算誤差を避けるため、LEAFの数量は内部的に0.1g単位の整数（×10）で計算し、保存・表示時に戻す
- フロントエンド・GASの双方で同じ関数を使ってチェックする

---

## 5. ドメインロジック（shared/domain）

| 関数 | 内容 |
|---|---|
| `selectLotForConsume(lots, brandId)` | 引当ルール（有効ロットを賞味期限昇順・未入力は最後→購入日昇順→作成日時昇順）で先頭ロットを返す。なければ null |
| `remainingServings(lots, brand)` | floor（有効ロット残量合計 ÷ servingAmount） |
| `maxServingsForLot(lot, brand)` | floor（ロット残量 ÷ servingAmount）。杯数選択の上限 |
| `alertLevel(lots, brand, today)` | 'EXPIRED' / 'NEAR_EXPIRY' / 'LOW' / 'NONE'（複数該当時は EXPIRED＞NEAR_EXPIRY＞LOW）※表示は複数バッジ可とするため `alerts(...)` で配列も返す。有効ロットがない銘柄は 'NONE'（在庫なし枠で扱うため、残りわずかにもしない）。SC-03 のロット単位のバッジは `alerts([lot], brand, today)` で求める |
| `summarizeByGenre(genres, brands, lots)` | ジャンルごとの銘柄数（有効ロットを持つ銘柄のみ）、LEAF合計g、BAG合計個。全ジャンルを表示順で返す |
| `displayUserName(email)` | メールアドレスの@より前を返す（履歴の操作者表示用） |

定数（constants.ts）：`NEAR_EXPIRY_DAYS = 30`、`LOW_SERVINGS = 3`、`DEFAULT_SERVING = { LEAF: 3, BAG: 1 }`

---

## 6. GAS詳細

### 6.1 リクエスト処理

```
doPost(e)
  → JSON.parse(e.postData.contents)
  → auth.verify(idToken)          … 失敗時 AUTH_*
  → router で action を判定       … 不明なら UNKNOWN_ACTION
  → 参照系：そのまま実行
  → 更新系：lock.withLock(() => idempotency.run(opId, action, () => service(...)))
  → ContentService.createTextOutput(JSON).setMimeType(JSON)
```

- 想定外の例外は捕捉して INTERNAL_ERROR を返し、詳細は `console.error` に出力する

### 6.2 認証（auth.ts）

1. `https://oauth2.googleapis.com/tokeninfo?id_token=…` を UrlFetchApp で呼び出す
2. `aud` ＝ スクリプトプロパティ `OAUTH_CLIENT_ID`、`email_verified` ＝ true、`exp` ＞ 現在時刻 を確認
3. `email` がスクリプトプロパティ `ALLOWED_EMAILS`（カンマ区切り）に含まれることを確認
4. 検証済みトークンは CacheService に「トークンのハッシュ → email」を有効期限まで保存し、以降の検証を省略する（応答時間短縮）

### 6.3 排他（lock.ts）

- `LockService.getScriptLock()`、`waitLock(10000)`。取得失敗は LOCK_TIMEOUT
- 処理後は finally で `releaseLock()`、書き込み後に `SpreadsheetApp.flush()`

### 6.4 冪等性（idempotency.ts）

- operations シートを op_id で検索し、存在すれば保存済み result を返す（action が異なれば OP_ID_MISMATCH）
- 存在しなければ処理を実行し、成功時のみ op_id と result を記録する（業務エラー時は記録しない＝同じ op_id で再試行可能）

### 6.5 シートアクセス（repository）

- 1行目をヘッダーとし、列名で列位置を解決する（列順の変更に強くするため）
- 読み込み：`getDataRange().getValues()` で全件取得（データ量が小さいため）
- 行の特定：ID列を走査して行番号を得る
- 更新：`getRange(row, 1, 1, 列数).setValues()` で1行単位に書き込む
- 追加：最終行の次の範囲に `setValues()` で書き込む（先に書式なしテキストを設定して自動変換を防ぐため。複数行をまとめて追加できる）
- 日付・日時・UUID列は書式を「書式なしテキスト」に設定し、スプレッドシートによる自動変換を防ぐ
- flavors は `JSON.stringify` した文字列、真偽値は TRUE/FALSE

### 6.6 保守処理（maintenance.ts）

| 関数 | 内容 | 実行方法 |
|---|---|---|
| `setupSheets()` | 6シートの作成、ヘッダー・書式設定 | GASエディタから手動実行（初回） |
| `seedInitialData()` | 色11件・ジャンル7件・銘柄14件・ロット14件の投入（01_requirements 5.1、05_ui_design 1.6）。データがあるシートがあれば中止する | GASエディタから手動実行（初回） |
| `purgeOperations()` | 30日より古い operations の行を削除 | 時間主導トリガー（毎日） |

- stock_histories は削除しない（想定：1日数件、年数千行で問題なし）
- 初期データのロットは、購入日を棚卸し日（2026-09-26）、賞味期限を未入力とする。購入量が分かる銘柄は購入量、分からない銘柄は残量と同じ値とする
- 初期データも在庫の増減として履歴に記録する：購入量で IN を記録し、購入量と残量が違う場合は差分を ADJUST で記録する（ロットの履歴の合計＝残量）

### 6.7 ビルド

- Rollup で `gas/src` と `shared` を1ファイル（`gas/dist/Code.js`）にバンドルし、`clasp push` する
- `doPost` 等のトリガー関数はトップレベルの関数として出力されること（ES module の export が残らないこと）を確認する ※実装初期に検証（スパイク）を行う

---

## 7. フロントエンド詳細

### 7.1 認証（auth/）

- `@react-oauth/google` を使用し、自動ログイン（auto_select）を有効にする
- 取得したIDトークンをメモリ上に保持する（localStorage には保存しない）
- APIが AUTH_INVALID_TOKEN を返した場合、トークンを再取得して同一リクエスト（同一 opId）を1回だけ再送する。再取得に失敗したら SC-01 へ遷移する

### 7.2 APIクライアント（api/）

- `fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req) })`
- 更新系の opId は操作開始時に `crypto.randomUUID()` で採番し、再送時も同じ値を使う
- 環境変数：`VITE_GAS_URL`、`VITE_OAUTH_CLIENT_ID`（GitHub Actions の Variables から注入）

### 7.3 TanStack Query

| クエリキー | 内容 | 備考 |
|---|---|---|
| `['all']` | getAll | 起動時・画面復帰時に取得。staleTime 30秒 |
| `['histories', brandId]` | getHistories | SC-03 表示時に取得 |

- 在庫を変更する更新系（consume, adjustLot, depleteLot, restoreLot, receiveLot）は楽観的更新を行う：`onMutate` で `['all']` のキャッシュを書き換え、`onError` で元に戻し、`onSettled` で `['all']` と該当 `['histories', brandId]` を再取得する
- マスタ系（ジャンル・銘柄）は楽観的更新を行わず、成功後に再取得する
- VERSION_CONFLICT 時はダイアログで通知し、`['all']` を再取得する

### 7.4 ルーティング

| パス | 画面 |
|---|---|
| `#/login` | SC-01 |
| `#/` | SC-02 |
| `#/brands/new` | SC-04（新規） |
| `#/brands/:brandId` | SC-03 |
| `#/brands/:brandId/edit` | SC-04（編集） |
| `#/brands/:brandId/purchase` | SC-05 |
| `#/summary` | SC-06 |
| `#/settings` | SC-07 |

### 7.5 主要コンポーネント

| コンポーネント | 用途 |
|---|---|
| `BottomNav` | タブ（在庫・集計・設定） |
| `BrandCard` | SC-02 の銘柄カード |
| `AlertBadges` | 期限切れ・期限間近・残りわずかのバッジ |
| `ConsumePanel` | SC-03 上部：杯数ステッパー＋飲んだ、量指定、残り全部使った |
| `LotList` / `LotItem` | ロット一覧と操作メニュー |
| `HistoryList` | 在庫履歴 |
| `QuantityDialog` | 量指定・残量調整の入力 |
| `ConfirmDialog` | 使い切り確認・削除確認 |
| `UndoSnackbar` | 使い切り直後の「元に戻す」（6秒表示、restoreLot を呼ぶ） |
| `FlavorInput` | フレーバーのタグ入力（既存フレーバーを入力候補に表示） |
| `TeaCup` | お茶の色の丸（枠＝ジャンルの色、塗り＝残量÷購入量合計）。独自コンポーネント |
| `ColorPicker` | ジャンルの色選択（色マスタの候補から1つ） |
| `BottomSheet` | ロット・銘柄・ジャンルの操作メニュー |

### 7.6 表示ルール

- 数量表示：LEAF は `12.5g`（整数なら `12g`）、BAG は `8個`
- 日付表示：`2026/09/26`
- SC-02 の並び順の初期値：強調状態（期限切れ→期限間近→残りわずか→なし）→銘柄名

---

## 8. 実装順序（開発フェーズの計画）

| 順 | 内容 | 完了条件 |
|---|---|---|
| 1 | リポジトリ・モノレポ雛形、CI、CLAUDE.md | lint・テストがCIで通る |
| 2 | スパイク：GASバンドル → clasp push → doPost 疎通、GitHub Pages から fetch | Pages から GAS の固定レスポンスを取得できる |
| 3 | shared：型・定数・validation・domain＋単体テスト | テスト合格 |
| 4 | GAS：setupSheets・seedInitialData・getAll | 初期データを取得できる |
| 5 | 認証：GoogleログインとGAS側検証 | 許可外アカウントが拒否される |
| 6 | SC-02 在庫一覧・SC-03 銘柄詳細（参照） | 初期データが表示される |
| 7 | consume・depleteLot・restoreLot と ConsumePanel | 杯数消費・使い切り・元に戻すが動作する |
| 8 | 残りの更新系API・画面（SC-04〜07） | 全機能要件を満たす |
| 9 | PWA対応（ホーム画面追加用 manifest） | スマホのホーム画面から起動できる |
