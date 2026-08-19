# Futa E

Futa E は、画像・動画・Web ページを複数のディスプレイへ全画面表示する、macOS 向けのローカルサイネージプレイヤーです。設定と素材は端末内で管理し、Cloud サービスなしで動作します。

現在の配布対象は Apple Silicon Mac です。対応状況の詳細は[既知の制約](./docs/known-limitations.md)を参照してください。

## 主な機能

- 接続中の複数ディスプレイへの Kiosk 表示
- 画像・動画・Web を組み合わせた複数プレイリスト
- プレイリストのループ、シャッフル、既定表示時間
- 項目ごとの自動、秒数指定、無期限の再生制御
- ディスプレイごとのプレイリスト項目設定
- 動画のミュート、Web 読込タイムアウト時のフォールバック画像
- 設定の自動保存
- 空のプレイリストや再生失敗時の Safe Mode
- renderer の無応答や停止を検出する基本的な Watchdog
- Kiosk 起動中の Display 接続変更と表示領域変更への追従
- macOS ログイン時のアプリ起動（Kiosk は自動開始しない）
- メニューバー、`Escape` キー、deep link による Kiosk 操作
- ユーザーが設定できるグローバルショートカットによる Kiosk 終了

## クイックスタート

1. [GitHub Releases](https://github.com/nekobato/futa-e/releases/latest) から `Futa-e-v<version>-darwin-arm64.zip` をダウンロードする。
2. ZIP を展開し、`Futa E.app` を `/Applications` へ移動する。
3. `Futa E.app` を起動する。
4. 使用する Display を有効にし、Playlist に画像・動画・Web を追加する。
5. 再生する Playlist を「再生対象にする」で選び、「開始」を押す。

Kiosk を終了するには、設定したグローバルショートカットを押します。
既定値は `CommandOrControl+Shift+K` です。
`Escape` キーを 2 秒以内に 3 回押す方法と、メニューバーの「Kioskを停止」も利用できます。

詳しい導入方法は[インストール](./docs/installation.md)、設定方法は[操作ガイド](./docs/usage.md)を参照してください。

## ドキュメント

- [インストール](./docs/installation.md)
- [操作ガイド](./docs/usage.md)
- [既知の制約](./docs/known-limitations.md)
- [ローカルプレイヤー仕様](./docs/local-player-spec.md)
- [セキュリティレビュー](./docs/security-review.md)
- [実装計画と進捗](./PLAN.md)
- [Web 背景カタログ](https://nekobato.github.io/futa-e/)

## 開発

Node.js `22.14.0` と pnpm `9.15.0` を使用します。

```bash
git clone https://github.com/nekobato/futa-e.git
cd futa-e
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm dev
```

主な検証コマンドは次のとおりです。

```bash
pnpm test
pnpm lint
pnpm build
```

`pnpm preview` は renderer のプレビューであり、Electron アプリ全体は起動しません。開発・パッケージ作成の詳細は[インストール](./docs/installation.md#ソースから起動する)を参照してください。

## プロジェクトの範囲

このリポジトリはローカル版 Futa E を対象とします。正式な Manifest、Device Protocol、端末管理、認証、配布、監視を担う Futa-e Cloud は実装していません。

## ライセンス

このプロジェクトは MIT License で公開しています。詳細は [LICENSE](./LICENSE) を参照してください。
