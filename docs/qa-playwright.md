# Playwright QA

## 目的

このプロジェクトでは、Electron 本体ではなく browser mock を使って renderer の QA を行います。
これにより、Vite dev server 上で control view と player view を Playwright から安定して確認できます。

## 前提

初回だけ Chromium を入れます。

```bash
pnpm run qa:install
```

## 実行

```bash
pnpm run qa
```

Playwright は `playwright.config.ts` の `webServer` 設定を使い、`pnpm dev --host 127.0.0.1 --port 4173` を自動で起動します。

## mock の考え方

- Electron API が存在しない場合、renderer は browser mock API を使う
- mock の設定は `localStorage` に保存する
- e2e test は `futae:mock:config` を直接 seed して画面確認する

## 現在の QA 対象

- control view の `モニターを個別に設定する` 切り替え
- broken media の skip
- playlist の `perDisplay = true` 時の display ごとの playlist 適用
