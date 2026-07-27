# Futa-e V1 実装計画

最終同期日: 2026-07-15

## 現在地

Apple Silicon Mac向けのローカルPlayerはv0.0.3まで公開済みである。
複数DisplayへのKiosk表示、画像と動画とWebの再生、複数Playlist、Display別設定、Safe Mode、基本Watchdog、deep link、署名と公証を実装している。
現在の作業ツリーではREADME、インストール、操作、既知の制約、実装状況の同期を進めているが、LICENSEはまだ存在しない。
このリポジトリの実装対象はローカルPlayerとし、Cloudは別リポジトリの長期構想として扱う。

## 次に行うこと

- [ ] READMEが参照するLICENSEを追加し、ライセンス方針を`package.json`と文書へ反映する。
- [ ] 現HEADで`lint`、`typecheck`、`test`、application buildを実行し、v0.0.3のartifactとの対応を記録する。
- [ ] 複数Display、offline、fallback、Safe Mode、Watchdog、Kiosk終了、deep linkを実機で確認する。
- [ ] rendererからabsolute pathを扱うlocal media bridgeと、Web contentを表示する`iframe`のsandboxとCSPをsecurity reviewする。
- [ ] remote cacheのContent-Type、hash、整合性、容量上限、重複排除、削除方針を決める。
- [ ] 段階的Watchdog、Display hot-plug時の再配置、OSログイン時の自動起動、再起動後のKiosk復帰を実装する。
- [ ] application CIへfrozen install、lint、typecheck、test、buildを追加する。
- [ ] Manifest v1 JSON SchemaとDevice Protocol v1をこのリポジトリで扱う範囲を決める。
- [ ] Windows、Linux、Intel Macを対応範囲に含めるか決める。

# 0. リポジトリのスコープ

本リポジトリはOSSとして公開する**Futa-e**専用である。
**Futa-e Cloud**は別リポジトリで実装し、本計画内のCloud記述は概念整理に留める。

# 1. V1 の定義

## 1.1 目標

- **Futa-e（無料・OSS 可）**：
  ローカルで完結する“蓋絵プレイヤー”。

  - 小規模サイネージ（ミニ PC 運用）
  - 個人装飾の蓋
  - プライバシー用の蓋（※セキュリティ代替ではない）

- **Futa-e Cloud（有料）**：
  複数端末・複数人運用の“統制・配布・監視”を提供する。

## 1.2 スケール前提

- 契約者最大 10,000 を想定（端末数は契約者 × 数台〜十数台を現実ラインとして計画）
- V1 では **「全端末に常時リアルタイム Push」** を必須にしない
  → 基本は **端末の軽いポーリング + ETag/キャッシュ**、必要な顧客だけ後で Push（Durable Objects）に載せるのが安全。

---

# 2. 設計原則

## 2.1 ローカルファーストの徹底

**PlayerはCloudがなくても成立する**ことを原則とする。

- 端末がネット不調でも表示は続く（展示の現場で最重要）
- “無料/OSS”を本気で成立させるには、Cloud への依存を断ち切る必要がある
- その上で、Cloud は「便利・統制・保守」を売る（後述）

> 意図：無料版を試用版に限定せず、Cloudを必要としない運用を完成させる。

## 2.2 Contract-first：Manifest を唯一の契約にする

ローカル運用もリモート運用も、**同じ Manifest（設定スキーマ）**で Player が動く。

- ローカル：manifest を端末内で作る（GUI でもファイルでも）
- リモート：Cloud が manifest を生成して配る

> 意図：Cloud を後から作っても Player を作り直さない。
> 表示内容の契約を固定し、ローカルとCloudの配布方法を交換可能にする。

## 2.3 コントロールプレーンとデータプレーンの分離

- **コントロールプレーン（Workers + D1）**：権限、ルーム、端末登録、公開（publish）の“台帳”
- **データプレーン（R2 + CDN）**：manifest と素材を“静的”に配る

> 意図：
> 端末数が増えてもDB負荷が比例しないように、端末は静的なmanifestを取得し、eventは非同期処理へ送る。
> また R2 はエグレス帯域課金が無い方針が明記されており、配信コストを読みやすくできます。 ([Cloudflare Docs][1])

## 2.4 Failure-first：落ちないより“戻る”

サイネージの価値は「最悪でも絵が出ている」こと。

- Watchdog（無応答 → 復旧）
- Safe Mode（最後の砦：静止画 1 枚でも出す）
- オフラインキャッシュ（ネットが切れても継続）
- Publish の原子性（新セットが揃うまで切替しない）

> 実装技術を変更しても、段階的な復旧手順を維持できる設計にする。

## 2.5 Cloud は「他人の表示を安全に触れる」ことを売る

ルーム/グルーピング + 権限（RBAC）は、有料価値の中心です。

- 間違えて全店の画面を変える、を防ぐ
- 特定ルームだけ任せる（委任）
- 承認・監査（誰がいつ変えたか）

> 意図：
> 編集範囲を権限で限定し、組織運用の誤操作を防ぐ。

---

# 3. 技術アーキテクチャ（V1 の最適形）

## 3.1 Cloudflare 構成（V1）

- **Admin Web**：Nuxt → Cloudflare Pages
  Cloudflare は Nuxt の Pages デプロイガイドを提供しています。 ([Cloudflare Docs][2])
  Nuxt 側も Cloudflare 向けデプロイ情報があります。 ([Nuxt][3])
- **API**：Cloudflare Workers（Hono 等は任意）
- **DB**：Cloudflare D1（台帳データ）
  D1 は 1DB 10GB 上限で増やせない旨が明記され、水平分割（per-tenant 等）を前提にしています。 ([Cloudflare Docs][4])
- **Object Storage**：Cloudflare R2（素材・manifest・エクスポート）
  R2 はエグレス帯域課金が無い旨が明記されています。 ([Cloudflare Docs][1])
- **Cache**：Workers KV（“参照キャッシュ”だけ）
  KV は読み取りが eventually consistent になり得ることが公式に説明されています。 ([Cloudflare Docs][5])
- **Async**：Workers Queues（イベント処理を要求経路から外す）
  at-least-once delivery が標準で、重複到達があり得る前提が明記されています。 ([Cloudflare Docs][6])
- **Realtime（任意）**：Durable Objects + WebSockets
  Durable Objects の WebSocket/hibernation 関連のベストプラクティスが提供されています。 ([Cloudflare Docs][7])
- **Analytics（任意）**：Workers Analytics Engine
  unlimited-cardinality + SQL API が説明され、保持は 3 ヶ月と明記されています。 ([Cloudflare Docs][8])
- **定期処理**：Cron Triggers（集計・掃除・エクスポート）
  scheduled handler で動かすことが明記されています。 ([Cloudflare Docs][9])

> 注：Nuxt は Pages 以外に「Workers Module」方向もあり、Nitro 側は Workers Module 推奨という記述もあります。V1 は運用を単純にするため **Pages で Admin をホストし、API は別 Workers**に分離するのが分かりやすいですが、将来 SSR の要請が強まれば Workers Module へ寄せる逃げ道を残します。 ([Nitro][10])

---

# 4. 実装計画（フェーズと成果物）

時間見積もりではなく、依存関係と完了条件で区切る。

## Phase 0：リポジトリと作法を先に決める

### 成果物

- [ ] manifest schema（Player で参照する JSON Schema。Cloud 側は別リポジトリで同一仕様を参照）
- [ ] shared 定義の完成（型と IPC は実装済み。共通エラーコードとログ形式は未定義）
- [ ] Player の CI（現行 CI は Web 背景カタログの build / deploy のみ）
- [ ] ライセンス方針の確定と README / `package.json` への反映

### 判定条件

- schema 変更が PR でレビューできる（＝契約がバージョン管理されている）
- Player/Cloud が同じ schema パッケージを参照できる

---

## Phase 1：Contract（Manifest & Device Protocol）を凍結する

### 思想

この契約を先に固定し、後工程の手戻りを抑える。

### 成果物

- **Manifest v1**（最低限）

  - assets（image/video/web）
  - playlist（順序/秒数/ループ/ランダム）
  - layout（全画面/モニタ割当）
  - fallback（Web 失敗時の代替）
  - mode（signage/decor/privacy）

- **Device Protocol v1**

  - enroll（端末登録）
  - manifest fetch（現在の manifest 取得）
  - heartbeat（死活）
  - events（Proof of Play 等のイベント送信）

### 判定条件

- “ローカル運用”が manifest だけで完結する
- “リモート運用”は manifest を配るだけで成立する（プレイヤーに特別 API を持ち込まない）

---

## Phase 2：Futa-e v1（無料・OSS）の完成

### 思想

V1ではPlayerの安定性をCloud実装より先に固める。

### 機能（必須）

- [ ] オフラインキャッシュ（URL に拡張子がある image/video の追加時キャッシュのみ実装済み。Content-Type / hash / 整合性検証、上限、掃除、重複排除は未実装）
- [ ] Watchdog（renderer の heartbeat、無応答、停止時の reload は実装済み。段階的復旧は未実装）
- [ ] フォルダ単位の画像・動画取り込み

### 機能（任意だが早期に効く）

- [ ] “Privacy lid”の即時トグル（ホットキー）
- [ ] “Decor”用のテーマ/遷移

### 判定条件（サイネージとしての DoD）

- [ ] ネット切断 → 再接続でも表示が継続・復帰する（キャッシュ済み画像・動画に限り継続可能）
- [ ] Web が落ちる/遅い → fallback に落ちる（item が切り替わる前に timeout へ到達した場合の fallback のみ実装済み。HTTP エラーや埋め込み拒否は検出できない）
- [ ] 端末再起動 → 自動で展示状態に戻せる（OS の自動起動設定を含む）

---

## Phase 3：Futa-e Cloud v1（配布と権限の最小）

### 思想

V1のCloudは配布場所だけでなく、操作可能な範囲を権限で保証する。

### 成果物（コア）

- **データモデル（D1）**

  - org（契約）
  - users / memberships
  - rooms
  - screens（devices）
  - playlists / assets / schedules（台帳）
  - publishes（公開履歴：manifest の versioned key）

- **Publish パイプライン**

  - 下書き →publish で manifest 生成 →R2 へ versioned 保存
  - “current pointer” を更新（D1 を真実に）
  - KV は参照キャッシュにのみ使用（KV は eventually consistent のため） ([Cloudflare Docs][5])

- **端末登録（enroll）**

  - pairing code 方式（現場で入力しやすい）
  - device token 発行（以後の API 認証）

- **端末取得（poll）**

  - `GET current manifest`（ETag で軽量化）
  - 素材は R2 配信（必要なら署名 URL/短命 URL）

### 成果物（運用）

- heartbeat/events を **Queues に投入** → 非同期で D1/WAE へ
  at-least-once 前提で idempotent（重複を許す）に設計します。 ([Cloudflare Docs][6])
- Admin Web（Nuxt）

  - org/room/screen の CRUD
  - playlist/asset 管理
  - publish ボタン
  - 端末状態一覧（直近 heartbeat）

### 判定条件

- 1 契約で複数ルーム・複数端末を管理できる
- 権限で「他人の表示を変えられる範囲」を確実に絞れる
- publish→ 端末反映が“運用として”手触り良く成立する（ログ/失敗理由が見える）

---

## Phase 4：有料の芯を太くする（差別化機能）

V1.1〜として、売上に直結する順に積みます。

1. **Override（緊急上書き）**

- ルーム単位で即時差し込み
- まずは“次回 poll で反映”でよい
- 即時反映は Durable Objects WebSocket を後から追加（任意） ([Cloudflare Docs][7])

2. **監視と通知（Monitoring）**

- 黒画面推定、一定時間 heartbeat 無し、素材 DL 失敗率など
- WAE を短期分析に使うなら保持 3 ヶ月制約を前提に（長期は R2 へ退避） ([Cloudflare Docs][11])

3. **Proof of Play（再生証跡）**

- “広告・監査”用途に耐える粒度
- イベント量が増えるので Queue→ 集計 →R2 エクスポートが本筋

4. **監査ログ・承認フロー**

- 誰がいつ何を publish/override したか
- “事故りにくさ”に課金が乗る領域

---

## Phase 5：Windows 対応（Player 移植）

### 思想

Windows対応では、PlayerのOS依存部分をadapterへ分離する。

### 実装方針

- Player 内部を「プレイリストエンジン」と「表示 OS アダプタ」に分けておく
- Windows 固有は表示/自動起動/電源周りに閉じ込める

### 判定条件

- 同一 manifest で macOS/Windows が再生できる
- Cloud 側は OS 差を意識せず配布できる

---

# 5. 重要設計の“落とし穴”と先手

## 5.1 KV を“真実”にしない

KV は高速ですが eventually consistent と説明されています。 ([Cloudflare Docs][5])

- 真実（current manifest pointer、権限、課金状態）は D1/DO へ
- KV は「参照キャッシュ」「負荷逃がし」のみに限定

## 5.2 Queue は重複が来る前提

Queues は at-least-once が標準で、稀に複数回届くと明記されています。 ([Cloudflare Docs][6])

- イベントは **idempotency key**（deviceId + seq + hash 等）で重複排除可能に
- 集計も“足し算が壊れない”形に（重複に強い集計）

## 5.3 D1 は“分割できる前提”で設計する

D1 は 1DB 10GB 上限で増やせず、水平分割（per-tenant 等）を前提にしています。 ([Cloudflare Docs][4])

- V1 は単一 DB で開始してよい
- ただしキー設計は **org_id を全テーブルに持たせる**（将来シャーディングの移行路を残す）

## 5.4 Analytics は短期、長期は R2 へ

Workers Analytics Engine は保持 3 ヶ月。 ([Cloudflare Docs][11])

- “運用ダッシュボード”は 3 ヶ月で足りることが多い
- “広告証跡”や“年間レポート”は R2 へ日次エクスポート（Cron Triggers） ([Cloudflare Docs][9])

---

# 6. 具体的な作業分解（そのまま Issue にできます）

## 6.1 仕様（Design Doc）

- [ ] Manifest v1 JSON Schema（versioning 方針込み）
- [ ] Device Protocol v1（API エンドポイント、認証、ETag）
- [ ] RBAC 最小セット（role→permission matrix）
- [ ] Publish 原子性（R2 versioned + pointer update + rollback）

## 6.2 Player（macOS）

- [ ] Display manager（モニタ列挙と Kiosk window 生成は実装済み。hot-plug 復帰は未実装）
- [ ] Cache manager（image/video の HTTP status を確認したダウンロードのみ実装済み。Content-Type / hash / 整合性検証、上限、重複排除、掃除は未実装）
- [ ] Watchdog（renderer health と reload は実装済み。段階的復旧と native fallback は未実装）
- [ ] OS ログイン時の自動起動
- [ ] アプリ内自動更新

## 6.3 Cloud（Workers + D1 + R2）

- [ ] Auth（外部 IdP 採用推奨：自前実装は V1 で重い）
- [ ] D1 schema & migration
- [ ] R2 bucket layout（assets / manifests / exports）
- [ ] Publish API（draft→publish→manifest 生成）
- [ ] Device enroll & token
- [ ] Device manifest fetch（ETag、room pointer）
- [ ] Heartbeat/events ingest（Queues）
- [ ] Admin Web（Nuxt Pages）

  - [ ] Rooms / Screens / Assets / Playlists / Publish
  - [ ] State dashboard（last seen、エラー）

---

# 7. 仕上げの判定（V1 としての“成立条件”）

- [ ] **ローカル単体で展示運用できる**（基本再生は可能。自動起動、完全な offline、hot-plug 復帰が未完了）
- [ ] **Cloud は「ルーム + 権限」で他人の表示を安全に変えられる**（別リポジトリの対象）
- [ ] **端末が増えても、端末側は静的配布物を取りに行くだけ**（Cloud 未実装）
- [ ] **障害が起きても、絵が消えない**（renderer crash-loop を含む最後の砦は未実装）

---

[1]: https://developers.cloudflare.com/r2/pricing/?utm_source=chatgpt.com 'R2 pricing'
[2]: https://developers.cloudflare.com/pages/framework-guides/deploy-a-nuxt-site/?utm_source=chatgpt.com 'Nuxt · Cloudflare Pages docs'
[3]: https://nuxt.com/deploy/cloudflare?utm_source=chatgpt.com 'Deploy Nuxt to Cloudflare'
[4]: https://developers.cloudflare.com/d1/platform/limits/?utm_source=chatgpt.com 'Limits · Cloudflare D1 docs'
[5]: https://developers.cloudflare.com/kv/concepts/how-kv-works/?utm_source=chatgpt.com 'How KV works · Cloudflare Workers KV docs'
[6]: https://developers.cloudflare.com/queues/reference/delivery-guarantees/?utm_source=chatgpt.com 'Delivery guarantees - Queues'
[7]: https://developers.cloudflare.com/durable-objects/best-practices/websockets/?utm_source=chatgpt.com 'Use WebSockets · Cloudflare Durable Objects docs'
[8]: https://developers.cloudflare.com/analytics/analytics-engine/?utm_source=chatgpt.com 'Workers Analytics Engine'
[9]: https://developers.cloudflare.com/workers/configuration/cron-triggers/?utm_source=chatgpt.com 'Cron Triggers - Workers'
[10]: https://nitro.build/deploy/providers/cloudflare?utm_source=chatgpt.com 'Cloudflare'
[11]: https://developers.cloudflare.com/analytics/analytics-engine/limits/?utm_source=chatgpt.com 'Workers Analytics Engine — Limits'
