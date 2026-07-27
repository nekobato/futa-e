# 既知の制約

この文書は、現在の実装で保証していない動作と、運用時に注意が必要な点をまとめたものです。

## 対応環境と配布

- 公開済みアプリは macOS 12 以降の Apple Silicon（`arm64`）向けのみです。
- Intel Mac、Windows、Linux 向けの配布物はありません。
- DMG、Homebrew、Mac App Store での配布はありません。ZIP を手動で配置します。
- アプリ内の自動更新はありません。更新版の ZIP を手動で再インストールします。
- packaged macOS appでは、OSログイン時にFuta-eを起動する設定を利用できます。開発モードでは設定できません。
- OSログイン時に起動するのは操作画面とメニューバーだけです。Kioskは自動開始しません。

## 素材とキャッシュ

- ローカル素材はアプリへコピーせず、元の場所から再生します。renderer向け設定にはopaque asset IDだけを保存し、対応するabsolute pathと`realpath`はmain process専用のregistryで管理します。
- ファイルの移動・削除、symlinkの参照先変更、外付けVolumeの切断により再生できなくなります。Futa-eは素材を自動修復・再検索しません。
- フォルダ単位の取り込みはありません。ファイル選択画面では複数ファイルを選択できます。
- 選択したファイルの内容、利用権、codec、実際のmedia形式はユーザーが確認してください。Futa-eは拡張子とファイル種別を制限しますが、malware scanや内容hashによる検証は行いません。
- URL で追加した画像・動画・Web はアプリ独自にダウンロードまたは永続保存しません。通常の表示高速化には Chromium 標準の HTTP cache だけを使用します。
- Chromium の cache 状態にかかわらず、オフライン再生は保証しません。取得できない画像・動画は次の項目へ進み、再生可能な項目がなければ Safe Mode を表示します。
- 選択可能な動画拡張子であっても、codec によっては Electron/Chromium で再生できません。

## Web 表示

- Web は `iframe` で表示します。対象サイトの `X-Frame-Options`、Content Security Policy、認証状態などにより表示できない場合があります。
- フォールバックは読込タイムアウトを基準にしています。HTTP エラーページや埋め込み拒否を確実には検出できません。
- Playlist 項目の表示時間が Web 読込待機時間より短い場合は、フォールバックを表示する前に次の項目へ進みます。
- Web のオフラインキャッシュ、Service Worker の管理、ログイン情報の管理は行いません。
- Web URL は有効な absolute HTTPS URL に限定します。保存済み設定に非 HTTPS の URL が残っている場合は読み込まず、フォールバックへ切り替えます。
- Web content は sandbox や Permissions Policy で機能を制限していません。Futa-e は表示先の内容や安全性を判定しないため、URL を登録するユーザーが表示先を確認して運用してください。

## 再生とレイアウト

- 同時に再生できるのは「再生対象にする」で選んだ 1 つの Playlist だけです。スケジュール再生はありません。
- Display ごとに個別化できるのは Playlist の項目リストです。ループ、シャッフル、既定時間、Web 読込待機時間は共通です。
- 画像と動画は常に画面全体を覆う `object-fit: cover` で表示します。`contain`、位置、crop、transition は設定できません。
- `ループ再生` がオフの場合、最後の項目の終了後は Safe Mode を表示します。
- エラーになった項目はその周回で飛ばし、自動再試行しません。
- 動画の `秒数指定` は再生時間の上限として働きます。指定秒数より先に動画が終了した場合は、その時点で次の項目へ進みます。

## Display と Kiosk

- Kiosk起動中にDisplayを無効にすると対応するplayer windowを閉じ、有効にすると追加します。Playlistの変更は起動中のplayerへ反映します。
- Displayの追加・取り外し・表示領域変更を検出すると、Kiosk windowを現在のDisplay構成へ再配置します。一時的に表示が途切れる場合があります。
- 新しく検出したDisplayは無効な状態で一覧へ追加します。Kioskに使用する場合は、操作画面で明示的に有効化してください。
- Kiosk実行状態は保存しません。アプリまたはOSの再起動後は、必要に応じてKioskを手動で開始してください。
- Kiosk は OS のセキュリティ機能ではありません。`Escape` キーやメニューバーから終了できます。
- privacy mode と専用ホットキーは未実装です。

## 復旧と監視

- Watchdog は renderer の無応答、renderer process の停止、15 秒以上の heartbeat 停止を検出して window を reload します。
- 再試行回数の上限、backoff、app process の再起動、native fallback はありません。継続的な crash loop からの復旧は保証しません。
- Safe Mode は空の Playlist と検出可能な画像・動画の再生失敗に対応します。Web の HTTP エラーや埋め込み拒否、renderer 自体が表示できない場合の最後の砦にはなりません。
- 状態履歴、エラー履歴、Proof of Play、外部監視、通知はありません。

## 設定とサービス範囲

- 設定は端末内へ自動保存します。設定の import/export と履歴管理はありません。
- 保存エラーは開発者 console へ出力しますが、操作画面には通知しません。
- 正式な Manifest schema、Device Protocol、Cloud 同期、認証、RBAC、監査ログは未実装です。
