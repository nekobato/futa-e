# インストール

## 対応環境

現在公開しているアプリは、次の環境を対象とします。

- macOS 12 以降
- Apple Silicon（`arm64`）

Intel Mac、Windows、Linux 向けの配布物はありません。

## 公開済みアプリをインストールする

1. [最新の GitHub Release](https://github.com/nekobato/futa-e/releases/latest) を開く。
2. Assets から `Futa-e-v<version>-darwin-arm64.zip` をダウンロードする。
3. ZIP を展開する。
4. `Futa E.app` を `/Applications` へ移動する。
5. `/Applications/Futa E.app` を開く。

現在、自動更新機能はありません。更新時は新しい ZIP をダウンロードし、終了した既存アプリを新しい `Futa E.app` で置き換えてください。設定は macOS の Application Support 領域に保存されるため、通常の上書き更新では引き継がれます。

## ソースから起動する

### 必要なツール

- Git
- Node.js `>=22.14.0 <23`（`.nvmrc` は `22.14.0`）
- pnpm `>=9.15.0 <10`（`package.json` は `9.15.0` を指定）

Corepack を利用すると、`package.json` の `packageManager` に従って pnpm のバージョンを揃えられます。

```bash
git clone https://github.com/nekobato/futa-e.git
cd futa-e
corepack enable pnpm
pnpm --version
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm --version` が `9.15.0` であることを確認してください。`pnpm dev` は Vite の開発サーバーと Electron を起動します。

## 開発時のコマンド

| コマンド         | 内容                                          |
| ---------------- | --------------------------------------------- |
| `pnpm dev`       | Vite と Electron を開発モードで起動する       |
| `pnpm test`      | Vitest の単体テストを 1 回実行する            |
| `pnpm typecheck` | TypeScript と Vue の型検査を実行する          |
| `pnpm lint`      | 型検査と Prettier の差分検査を実行する        |
| `pnpm format`    | Prettier でファイルを整形する                 |
| `pnpm build`     | renderer、Electron main、preload をビルドする |
| `pnpm web:dev`   | Web 背景カタログを開発モードで起動する        |
| `pnpm web:build` | Web 背景カタログをビルドする                  |

## 保守者向けの macOS パッケージ作成

`pnpm package:mac` は署名・公証を含む Apple Silicon 向け ZIP を作成します。macOS、Xcode Command Line Tools、Developer ID Application 証明書、Apple の公証用認証情報が必要です。

認証情報は、リポジトリへ commit しない `electron-builder.env` またはプロセス環境変数で渡します。

```dotenv
APPLE_TEAM_ID=...
APPLE_ID=...
APPLE_APP_SPECIFIC_PASSWORD=...
```

```bash
pnpm package:mac
```

成果物は `output/electron-builder/Futa-e-v<version>-darwin-arm64.zip` に生成されます。`package:mac` は GitHub へ公開しません。

`pnpm release` は GitHub へ成果物を公開する保守者向けコマンドです。実行には `GH_TOKEN` が必要で、リモートの Release を変更するため、通常のローカル確認には使用しません。
