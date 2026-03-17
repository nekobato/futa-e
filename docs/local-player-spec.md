# Local Player Spec

## 位置づけ

この文書は、Futa-e Player のローカル限定版に関する暫定仕様です。
当面は単一 PC 上で完結する運用を対象にし、Cloud、Device Protocol、厳密な Manifest schema は対象外とします。

## 目的

- ローカル環境だけで蓋絵プレイヤーとして動作できること
- 画像、動画、Web を playlist として再生できること
- 複数モニター環境で、まずは同一表示、その後に個別設定へ拡張できること
- mode のような抽象カテゴリではなく、再生内容、表示時間、overlay を個別設定できること

## 再生対象

- `image`
- `video`
- `web`

playlist item は少なくとも次の情報を持つ。

- `id`
- `type`
- `title`
- `src`
- `durationSec`
- `fallbackSrc`
- `mute`

## playlist のルール

- `loop` が有効なら最後まで再生した後に先頭へ戻る
- `shuffle` が無効なら定義順に再生する
- `shuffle` が有効なら 1 周のあいだ重複なしで再生する
- `shuffle` の 1 周が終わったら、同じ方法で再度シャッフルし直す
- `image` と `web` は `durationSec` を使って切り替える
- `durationSec` がない場合は `defaultDurationSec` を使う
- `video` は自然終了で次へ進む
- `video` に `durationSec` がある場合は、その秒数で打ち切って次へ進んでよい
- `mute` は item 単位の ON/OFF のみを持つ
- 音量値そのものは OS または PC 側に任せる

## Overlay

- overlay は runtime で ON/OFF する
- overlay が ON の間も playlist の時間は止めず、そのまま進める
- overlay を解除した時点では、その時の現在位置を表示する
- overlay の見た目は設定で個別に変更できる
- overlay 設定は少なくとも `title`、`message`、`imageSrc` を持つ
- 共通 overlay 設定と display ごとの overlay 設定を持てる

## Web の扱い

- `web` には `webTimeoutSec` を適用する
- 指定時間内に表示準備が整わない場合は fallback 表示へ切り替える
- fallback 表示中も playlist の時間は進める
- `fallbackSrc` がない場合は Safe Mode 用の既定画像を使う

## media error の扱い

- 画像、動画、Web の各 item でエラーが起きた場合は即座に skip する
- 自動再試行はしない
- 再生可能な item がなくなった場合のみ Safe Mode に入る

## Safe Mode

- playlist が空の場合は Safe Mode に入る
- 全 item が再生不能で表示継続できない場合は Safe Mode に入る
- Safe Mode は「最低限、何かが表示されている状態」を守るための最後の砦とする
- Watchdog の細かい段階復旧や自動回復条件は、当面は厳密に定義しない

## マルチモニター

- 初期状態では、存在する全モニターに同一内容を表示する
- UI に `モニターを個別に設定する` の ToggleSwitch を用意する
- ToggleSwitch が OFF の場合は共通設定のみを使う
- ToggleSwitch が ON の場合は、現在存在するモニター一覧を取得し、各モニターごとに設定項目を表示する
- モニターごとの識別子には `Electron.Display.id` を使う
- 個別設定が存在しないモニターは共通設定へフォールバックする

## 設定データの考え方

ローカル設定の形式は、当面は次のような形を想定する。

```ts
type OverlayConfig = {
  title: string
  message: string
  imageSrc?: string
}

type PlayerConfig = {
  version: 1
  playlist: PlaylistItem[]
  loop: boolean
  shuffle: boolean
  defaultDurationSec: number
  webTimeoutSec: number
  overlay: OverlayConfig
  displayMode: 'mirror' | 'per-display'
  displays: Record<string, DisplayConfig>
  updatedAt: string
}

type DisplayConfig = {
  enabled: boolean
  playlist: PlaylistItem[]
  overlay: OverlayConfig
}
```

- `displayMode = 'mirror'` なら全モニターで共通設定を使う
- `displayMode = 'per-display'` なら `displays` の設定を優先する
- 将来 Manifest を定義する場合も、このローカル設定との差分が小さくなるように寄せる

## cache と offline

- リモートの `image` と `video` は、可能ならローカル cache へ保存してよい
- cache の上限容量は当面設けない
- cache の自動掃除はしない
- cache が作れない場合は、可能なら元の URL をそのまま使う
- ローカル運用を前提とし、厳密な整合性管理は後回しにする

## item 単位編集

playlist に追加済みの item ごとに、将来的には次の編集をできるようにしてよい。

- `title`
- `durationSec`
- `fallbackSrc`
- `mute`
- `src`

ただし初期段階では、追加、並び替え、削除だけでも成立する。

## 当面の対象外

- Manifest v1 の正式 schema
- Device Protocol v1
- Cloud 側の仕様
- 厳密な RBAC
- 高度な監視と分析
- OS 自動起動や配布の厳密な運用設計

## 方針

ローカル版は、まず実際に使えることを優先する。
細かい仕様は、問題が出た時に実装と運用の知見を踏まえて更新する。
