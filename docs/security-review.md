# セキュリティレビュー

レビュー日: 2026-07-27

対象:

- local media bridge（`futae-media://`）
- Web contentを表示する`iframe`
- 上記に接続するBrowserWindow、preload、IPC、CSP

基準:

- HEAD `dc144e1`
- Electron `43.0.0`
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron Web Embeds](https://www.electronjs.org/docs/latest/tutorial/web-embeds)
- [HTML Standard: iframe sandbox](https://html.spec.whatwg.org/multipage/iframe-embed-object.html)
- [Content Security Policy Level 3](https://www.w3.org/TR/CSP/)

## 結論

Criticalは確認されなかった。High 2件、Medium 4件を確認した。

現在の構成は`contextIsolation: true`、`nodeIntegration: false`であり、`webSecurity`も無効化していない。preloadは`ipcRenderer`自体ではなく用途別の関数だけを公開している。これらは適切である。

一方、ユーザーが選択したWebサイトを表示する前提に対して、権限要求、navigation、window生成、IPC sender、local file公開範囲、iframe capability、CSPの境界が不足している。Web項目は有効なabsolute HTTPS URLだけを受理するが、表示先の内容はユーザーが確認して運用する必要がある。

## 対応方針（2026-07-27）

- Web項目の`src`は、入力時と再生時の両方で有効なabsolute `https:` URLに限定した。`http:`、`data:`、`file:`、`futae-media:`、relative URLは`iframe`へ渡さない。
- 保存済み設定の非HTTPS URLは削除せず、再生時にfallback表示へ切り替える。
- 表示対象の内容、信頼性、権限要求、運用上の適合性は、URLを登録するユーザーが判断する。この製品方針により、`iframe` sandboxとPermissions Policyは採用せず、FUTA-SEC-005の残余リスクとして受容する。
- packaged rendererのCSPは今回の対象外であり、FUTA-SEC-006は未対応のままとする。これは表示対象への信頼とは別に、local rendererの追加防御に関するfindingである。
- local mediaは、rendererへabsolute pathを渡さず、main process専用registryのopaque asset IDからユーザーが選択した外部ファイルへ解決する方式へ移行した。FUTA-SEC-004は対応済みである。
- 素材はアプリ領域へコピーしない。ファイルの内容、権利、codec、移動・削除、外付けVolumeの接続状態はユーザーが管理する。

## Threat model

保護対象は次のとおり。

- ユーザーが選択したローカルファイルと、それ以外の端末内ファイル
- 保存済みPlayer設定と設定ファイルのパス
- Kioskの開始・停止、ファイル選択ダイアログなどのprivileged operation
- camera、microphone、geolocation、clipboard、notificationなどのOS・Chromium権限
- local rendererに公開されたpreload API

信頼しない入力は次のとおり。

- Playlistへ登録されたWeb URLと、その配信元が返すHTML、JavaScript、redirect
- remote image/video URLと、その応答
- rendererからmain processへ届くIPC payloadとsender
- `futae-media://` requestに含まれるopaque asset ID

製品運用上、登録するWeb URLと表示内容の選定はユーザーの責任とする。一方、security boundaryの評価では、配信元の侵害、redirect、動的な応答変更を考慮し、remote contentからpreload、IPC、filesystemへ権限が拡大しないことを引き続き目標とする。

ローカル設定画面のbundled codeは信頼する。ただし、local rendererでXSSが成立した場合や、BrowserWindowのmain frameがremote contentへnavigationした場合に、被害をpreload・IPC・filesystemへ拡大させないことを目標とする。

## Findings

### FUTA-SEC-001: remote contentのpermission requestがdefault allowになる

Severity: High

`electron/main.ts`では、remote contentを読み込むdefault sessionに`setPermissionRequestHandler`と`setPermissionCheckHandler`を設定していない。

Electronはhandler未設定時にpermission requestを自動承認する。Web項目は任意のURLを`iframe`へ読み込めるため、remote pageがcamera、microphone、geolocation、notification、clipboard、USBなどを要求できる。OS側の追加確認がある権限もあるが、Electron側のdefault allowをsecurity boundaryにはできない。

是正:

1. default sessionにpermission request/check handlerを設定し、原則としてすべて拒否する。
2. Web表示に必要なpermissionが判明した場合だけ、permission種別と完全一致するHTTPS originをallowlist化する。
3. display capture、USB、serial、HIDなど、個別handlerを持つdevice APIもdefault denyを確認する。

### FUTA-SEC-002: main-frame navigationとwindow生成を制限していない

Severity: High

`electron/main.ts`の`createWindow`は全BrowserWindowへpreloadを設定する一方、`will-navigate`、`will-frame-navigate`、`setWindowOpenHandler`を設定していない。

remote iframeは同一生成元ポリシーにより直ちにpreload APIへアクセスできるわけではない。しかし、main frameがremote URLへnavigationすると、同じBrowserWindowでpreloadが再実行され、remote pageへ`window.futae`が公開される。cross-origin iframeからのtop navigationにはuser activationなどChromium側の制約があるが、アプリ側で許可する理由はない。popupや新規windowも明示的に拒否していない。

是正:

1. main frameのnavigationをpackaged renderer URLだけに制限する。
2. iframeのframe navigationは検証済みHTTPS URLだけに制限する。
3. `setWindowOpenHandler`でwindow生成をdefault denyにする。
4. packaged buildでは`VITE_DEV_SERVER_URL`を参照しない。

### FUTA-SEC-003: privileged IPCがsenderとwindow roleを検証していない

Severity: Medium

`electron/main.ts`の`ipcMain.handle`と`ipcMain.on`はsenderを検証していない。control windowとplayer windowには同じpreload APIが公開されているため、player rendererからも設定保存、file picker、Kiosk制御を呼び出せる。

現状のremote iframeにはpreloadが直接公開されていないため、単独で直ちに悪用できるとは確認していない。ただし、FUTA-SEC-002のmain-frame navigationや将来のrenderer XSSと組み合わさると、設定の読み書き、ローカルパス取得、network request、Kiosk制御へ到達する。

是正:

1. 全IPCで`event.senderFrame`がmain frameであり、許可されたlocal renderer URLであることを検証する。
2. senderのBrowserWindow roleをcontrol/playerに分け、channelごとに許可するroleを限定する。
3. control/playerでpreload APIを分割し、playerには再生に必要なread-only APIとheartbeatだけを公開する。
4. payloadをruntime validationし、型注釈だけに依存しない。

### FUTA-SEC-004: local media protocolが任意のabsolute pathを受け付ける

Severity: Medium

Status: 対応済み

レビュー時点の`electron/main.ts`にあった`decodeLocalMediaPath`は、hostが`local`でpathがabsoluteであれば受理していた。pathのallowlist、`realpath`、regular file判定、media type判定、HTTP method制限はなく、その後`net.fetch(file://...)`で内容を返していた。

remote cross-origin iframeからresponse bodyを直接読めることは確認していない。custom schemeは`corsEnabled`を登録しておらず、同一生成元ポリシーが適用されるためである。ただし、local rendererが侵害された場合や将来protocol privilegeを変更した場合に、端末内の任意ファイルを読むprimitiveになる。HTMLなどmedia以外の文書も返せる。

対応:

1. file pickerはmain process専用registryへabsolute path、`realpath`、media typeを登録し、rendererへopaque asset IDと表示名だけを返す。
2. custom protocolは、現在のplayback configが参照する登録済みasset IDだけを解決する。
3. requestごとに`realpath`が登録値と一致するregular fileであることと、許可extension/MIMEを確認する。
4. `GET`と`HEAD`だけを受理し、`Range`以外のrequest headerをfile取得へ転送しない。
5. responseの`Content-Type`を許可extensionから固定し、`X-Content-Type-Options: nosniff`を付与する。
6. 許可・拒否・method・type・`Range`をunit testで検証する。

残余リスク:

- ファイルの中身は検査しない。内容、権利、codec、悪意あるmedia、移動・削除、外付けVolumeの管理はユーザー責任とする。
- check後からfile openまでの間に同じcanonical pathの内容が置換されるTOCTOUは残る。Futa-eはhash固定やfile descriptor保持を行わない。
- registryはpath metadataだけを保持し、素材のコピー、malware scan、容量管理、重複ファイル削除は行わない。

### FUTA-SEC-005: iframeにsandboxがない

Severity: Medium

Status: URL schemeは対応済み、iframe capabilityはリスク受容

`src/views/PlayerView.vue`の`iframe`に`sandbox`とPermissions Policyの`allow`がない。Web URLは入力時と再生時に有効なabsolute `https:` URLだけを受理し、それ以外のschemeやrelative URLは`iframe`へ渡さない。

unsandboxed iframeはscripts、forms、popup、download、modal、top navigationなど、通常のWeb page capabilityを持つ。`player-cursor-shield`はpointer操作を覆うUI要素であり、security boundaryではない。

対応:

1. Web項目は`https:`だけを許可し、HTTP localhostを含む例外を設けない。
2. `data:`、`file:`、`futae-media:`、custom protocolをWeb項目として拒否する。
3. `iframe` sandboxとPermissions Policyは、表示先をユーザーが確認する運用方針に基づき採用しない。

### FUTA-SEC-006: local rendererにCSPがない

Severity: Medium

`index.html`にContent Security Policyがなく、main processから付与するheaderもない。

現在のVue templateには`v-html`、`innerHTML`、`eval`などの明白なinjection sinkは確認されなかった。このため単独でXSSが成立する箇所は確認していない。ただし、local rendererでXSSが発生した場合、preload APIがprivileged operationへの経路になるため、CSPによる追加防御が必要である。

是正:

1. packaged rendererへ`default-src 'self'`を基準にしたCSPを設定する。
2. `object-src 'none'`、`base-uri 'none'`を設定する。
3. `script-src`をbundled scriptだけに限定し、`unsafe-eval`をproductionで許可しない。
4. `frame-src`をHTTPSへ限定する。
5. `img-src`と`media-src`には、必要な`self`、`https:`、`blob:`、`data:`、`futae-media:`だけを列挙する。
6. PrimeVue/Viteが必要とするstyleとdevelopment server接続は、production CSPとdevelopment CSPを分けて評価する。

parent documentのCSPはiframeへ読み込めるoriginを制限するが、remote document内のscript policyを上書きしない。remote document自体のCSPは配信元が管理するため、アプリ側の主な境界はiframe sandbox、URL validation、permission handler、navigation制限である。

## Recommended order

1. FUTA-SEC-001: permissionをdefault denyにする。
2. FUTA-SEC-002/003: navigation、window生成、IPC senderとwindow roleを制限する。
3. FUTA-SEC-006: packaged rendererのCSPを実装する。
4. unit testとElectron integration testで回帰を固定する。FUTA-SEC-004のunit testは追加済みである。

## Review limitations

このレビューはstatic reviewである。malicious remote pageを使ったElectron実機試験、OS permission prompt、署名・公証済みartifact、Chromium exploit、第三者penetration testは対象外とした。
