# Local Player Spec

## 位置づけ

この文書は、Futa-e のローカル限定版に関する暫定仕様です。
当面は単一 PC 上で完結する運用を対象にし、Cloud、Device Protocol、厳密な Manifest schema は対象外とします。

## 目的

- ローカル環境だけで蓋絵プレイヤーとして動作できること
- 画像、動画、Web を playlist として再生できること
- 複数モニター環境で、まずは同一表示、その後に個別設定へ拡張できること
- 再生内容と表示時間を複数の playlist として管理できること

## 再生対象

- `image`
- `video`
- `web`

playlist item は少なくとも次の情報を持つ。

- `id`
- `type`
- `src`
- `sourceName`
- `playbackMode`
- `durationSec`
- `fallbackSrc`
- `fallbackName`
- `mute`

## playlist のルール

- `loop` が有効なら最後まで再生した後に先頭へ戻る
- `shuffle` が無効なら定義順に再生する
- `shuffle` が有効なら 1 周のあいだ重複なしで再生する
- `shuffle` の 1 周が終わったら、同じ方法で再度シャッフルし直す
- `playbackMode = auto` の `image` と `web` は `defaultDurationSec` で切り替える
- `playbackMode = auto` の `video` は自然終了で次へ進む
- `playbackMode = duration` は `durationSec` で次へ進む
- `playbackMode = duration` の `video` が指定秒数より先に終了した場合は、自然終了時に次へ進む
- `playbackMode = forever` は次へ進まない。`video` はループ再生する
- `mute` は item 単位の ON/OFF のみを持つ
- 音量値そのものは OS または PC 側に任せる

## Web の扱い

- `web` の `src` は有効な absolute `https:` URL に限定する
- 入力時の検証を通らない URL は保存しない
- 保存済み設定に非 HTTPS の Web URL が残っている場合は `iframe` へ読み込まず、fallback 表示へ切り替える
- `web` には `webTimeoutSec` を適用する
- item が切り替わる前に指定時間へ到達し、表示準備が整っていない場合は fallback 表示へ切り替える
- fallback 表示中も playlist の時間は進める
- `fallbackSrc` がない場合は Safe Mode 用の既定画像を使う
- 表示対象の内容、信頼性、権限要求、運用上の適合性は、URL を登録するユーザーが判断する

## media error の扱い

- 画像と動画の検出可能なエラーは、該当 item を即座に skip する
- 画像と動画は自動再試行しない
- Web は読込 timeout 時に fallback を表示し、item 自体は skip しない
- Web の HTTP エラーや埋め込み拒否は確実に検出できない
- playlist の全 item が画像または動画で、すべて再生不能になった場合は Safe Mode に入る

## Safe Mode

- playlist が空の場合は Safe Mode に入る
- 検出可能な画像・動画エラーにより全 item が再生不能になった場合は Safe Mode に入る
- `loop = false` の playlist が最後まで完了した場合は Safe Mode に入る
- Safe Mode は「最低限、何かが表示されている状態」を守るための最後の砦とする
- Watchdogはrendererの無応答、renderer processの停止、15秒以上のheartbeat停止を検出し、対象windowをreloadする
- Watchdogの段階的復旧、app process再起動、native fallbackは実装しない

## マルチモニター

- 未登録のモニターは無効な状態で設定へ追加し、ユーザーが明示的に有効化する
- 有効な全モニターへ、初期状態では同一内容を表示する
- 各 playlist に `モニターを個別に設定する` の ToggleSwitch を用意する
- 再生対象 playlist の ToggleSwitch が OFF の場合は共通設定のみを使う
- 再生対象 playlist の ToggleSwitch が ON の場合は、現在存在するモニター一覧を取得し、各モニターごとに設定項目を表示する
- モニターごとの識別子には `Electron.Display.id` を使う
- 個別設定が存在しないモニターは共通設定へフォールバックする
- Kiosk起動中にモニターを取り外した場合は、対応するplayer windowを閉じる
- 有効な登録済みモニターを再接続した場合は、対応するplayer windowを再作成する
- モニターの追加・取り外し・表示領域変更時は、既存player windowを現在のboundsへ再配置する
- Kiosk起動後に初めて検出したモニターは、操作画面で有効化するまでKioskへ追加しない

## OSログイン時の起動

- packaged macOS appでは、操作画面からElectronのlogin itemを有効・無効にできる
- login itemの状態はmacOSを正とし、`PlayerConfig`には保存しない
- OSログイン時には操作画面とメニューバーを起動し、Kioskは自動開始しない
- Kiosk実行状態はprocess内だけで管理し、アプリまたはOSの再起動後には復元しない

## 設定データの考え方

ローカル設定の形式は、当面は次のような形を想定する。

```ts
type PlaylistItem = {
  id: string
  type: 'image' | 'video' | 'web'
  src: string
  sourceName?: string
  playbackMode?: 'auto' | 'duration' | 'forever'
  durationSec?: number
  fallbackSrc?: string
  fallbackName?: string
  mute?: boolean
}

type PlaylistConfig = {
  id: string
  name: string
  perDisplay: boolean
  loop: boolean
  shuffle: boolean
  defaultDurationSec: number
  webTimeoutSec: number
  items: PlaylistItem[]
}

type PlayerConfig = {
  version: 1
  activePlaylistId: string
  playlists: PlaylistConfig[]
  displays: Record<string, DisplayConfig>
  updatedAt: string
}

type DisplayConfig = {
  enabled: boolean
  playlists: PlaylistConfig[]
}
```

- `activePlaylistId` の playlist の `perDisplay = false` なら全モニターで共通設定を使う
- `activePlaylistId` の playlist の `perDisplay = true` なら `displays` の設定を優先する
- ローカル保存ファイルには `cloud` object を持たせない
- 将来 Cloud 連携を追加する場合も、取得データは API から供給し、ローカル設定仕様へ常設しない
- 現在の UI は一覧で選択した playlist を編集し、`activePlaylistId` の playlist を再生対象にする
- 将来 Manifest を定義する場合も、このローカル設定との差分が小さくなるように寄せる

## ローカル素材

- 選択したファイルはアプリ領域へコピーせず、元の場所から再生する
- ファイル選択時にmain processだけがabsolute pathと`realpath`を記録し、rendererへはopaque asset ID、media type、表示名だけを返す
- ローカル素材の`src`と`fallbackSrc`にはopaque asset IDを保存し、absolute pathは保存しない
- 旧バージョンの設定にabsolute pathが残っている場合は、初回読込時にmain process内のasset registryへ移行する
- `futae-media://`は、現在のplayback configが参照する登録済みasset IDだけを解決する
- 解決時は`realpath`が登録時から変わっていないregular fileであることと、拡張子が登録済みmedia typeに一致することを確認する
- protocolは`GET`と`HEAD`だけを受理し、動画再生に必要な`Range` requestをfile responseへ転送する
- responseの`Content-Type`は許可済み拡張子から固定し、`X-Content-Type-Options: nosniff`を付与する
- ファイルの内容、権利、codec、移動・削除、外付けVolumeの接続状態はユーザーが管理する
- malware scan、内容hash、アプリ領域への複製、素材容量管理は行わない

## cache と offline

- リモートの `image`、`video`、`web` は URL をそのまま Chromium に渡す
- アプリ独自の download、永続cache、Content-Type検証、hash管理、容量管理、重複排除、削除処理は持たない
- 通常の表示高速化には、Electronのdefault sessionで有効なChromium標準HTTP cacheだけを使用する
- networkから取得できない画像・動画はmedia errorとして扱い、次のitemまたはSafe Modeへ移る
- Webを指定時間内に読み込めない場合はfallback表示へ切り替える
- offline再生は保証しない

## item 単位編集

playlist に追加済みの item ごとに、次の項目を編集できる。

- `durationSec`
- `fallbackSrc`
- `mute`
- `src`
- `playbackMode`

追加、並び替え、削除にも対応する。

## 当面の対象外

- Manifest v1 の正式 schema
- Device Protocol v1
- Cloud 側の仕様
- 厳密な RBAC
- 高度な監視と分析
- アプリまたはOSの再起動後にKioskを自動復元する処理
- 配布の厳密な運用設計

## 方針

ローカル版は、まず実際に使えることを優先する。
細かい仕様は、問題が出た時に実装と運用の知見を踏まえて更新する。
