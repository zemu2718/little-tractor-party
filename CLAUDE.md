# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概况

这是一个给两岁宝宝过生日用的静态网页，没有任何第三方依赖。展示名只用 **齐齐**，不能出现全名，`check_site.py` 会检查。页面在手机上横屏打开，再镜像投到电视上，由宝宝直接点着玩。

项目没有构建步骤，也不用 npm：就是 `index.html`、`styles.css` 和三个以 `defer` 加载的脚本。README 和全部界面文字都是中文，与用户也用中文交流。

## 常用命令

```bash
node scripts/check_audio.cjs     # audio.js：声音开关、生日歌、停止与静音、真实音效加载与退回
node scripts/check_voice.cjs     # voice.js：家人录音、预生成配音、设备语音退回、连点竞态
node scripts/check_play.cjs      # app.js：场景、相册、蛋糕、小游戏、亲子模式、生命周期
python3 scripts/check_site.py    # 发布清单、相对路径、无外部依赖/SVG、JS 语法
python3 scripts/package_site.py  # 生成 dist/ 和 little-tractor-party-offline.zip
python3 -m http.server 8080 --bind 127.0.0.1   # 本地预览
node scripts/make_voice.mjs [--only 关键字] [--force]   # 重新生成台词配音（见下文）
node scripts/make_felt_sprites.mjs   # 重新生成 assets/deco/ 毛毡贴纸（需要 Chrome；macOS 下 OrbStack 会挂载 /Applications，脚本按平台选 Chrome）
node scripts/make_photo_backgrounds.mjs   # 把拍照背景的 AI 原图转成 WebP 和缩略图（需要 Chrome）
```

每个检查都是一个独立文件，「只跑一个测试」就是单独运行对应的那个文件。CI（`.github/workflows/pages.yml`）会依次跑完四项检查，然后打包，并把 `dist/` 发布到 GitHub Pages。

## 架构

- **全局对象，不用模块。**
  - `audio.js` 暴露 `window.PartyAudio`（Web Audio 合成音），`voice.js` 暴露 `window.PartyVoice`（语音和录音），`app.js` 使用这两者并操作 DOM。
  - 两份清单作为普通脚本先于它们加载：`assets/sfx/sfx.js` → `window.PARTY_SFX`，`assets/voice/voice.js` → `window.PARTY_VOICE`。
  - 清单写成脚本而不是 JSON，是为了在 `file://` 下也能用：离线包是解压后直接双击打开的。
- **场景。** `#stage` 里有四个场景：`home`、`album`、`cake`、`game`。
  - `app.js` 里的 `selectScene()` 是切换中枢。
  - `selectScene`、`syncPause`、`visibilitychange`、`pagehide` 都要负责清理当前场景的活动：提示、跳舞、视频、录音、生日歌和各种定时器。
  - 新加的定时类功能必须接入这几处。
- **派对展示与生日仪式。** `showMode` 时 `armIdle()` 改走 `armShow()`：在 `hintTimers` 里排角色自动表演（`perform`）和切场景（`nextShow`），所以 `clearHint()` 会一并清掉；相册放完最后一张由 `schedulePhoto`/视频 `onended` 调 `nextShow`。`ceremonyOn` 期间不排轮播，`stopCeremony()` 已接入 `selectScene`、`syncPause`、`visibilitychange`、`pagehide`、`exitChildMode`。
- **本机保存。** `store`（IndexedDB `qiqi-party`）保存照片/视频 Blob、家人录音（`savedClips`）和背景音乐，启动时 `restoreSaved()` 恢复；`vm` 测试里没有 `indexedDB`，所有调用都必须吞掉失败。
- **菜单。** 主菜单是底部一条 `.dock`，次要功能在 `#settings`（「更多」）向上弹出的 `.sheet` 里；拍照层是 `.booth-bar` 加按需拉出的缩略图抽屉。`armMenuIdle()` 让菜单 14 秒不操作自动收起（「更多」或抽屉开着时不收），`setMenuRestore()` 显示的「长按恢复」提示 4.5 秒后自动隐藏；轻点画面、H、Esc 都能叫回菜单。
- **压低音乐。** `voice.onSpeaking(on)` → `audio.duck(on)` 与 `#bgm` 音量；`audio.setLoopLevel()` 控制展示模式下的循环音量。
- **声音分层。**
  - **音效**：`audio.effect(kind)` 返回音效时长（秒）。`PARTY_SFX` 里登记了真实录音就播放录音：http(s) 下先 fetch 再解码；`file://` 下用 `<audio>` 加 `#t=start,end` 截取。没登记或加载失败时用合成音。清单条目支持 `start`、`end`、`gain`、`mix` 四个字段。
  - **叫声接台词**：`app.js` 的 `speakFor()` 先播放动物叫声，等叫声播完再调用 `voice.speak`。
  - **台词优先级**：`voice.speak(kind, text)` 按以下顺序尝试：
    1. 家人录音：页面内录的或选择的文件，多段时轮流播放；
    2. 预生成配音：`PARTY_VOICE["kind|text"]`；
    3. 设备的本地中文 `speechSynthesis`，优先增强版语音；
    4. 以上都没有时返回 `false`，由调用方改放短音效。
- **台词配音由 `app.js` 生成。**
  - `scripts/make_voice.mjs` 会解析 `lines`、`HINTS`、`FIND`、`ALBUM_LINES`、`PHOTO_TAP`、`COUNTDOWN` 这几个字面量，以及 `voice.speak('kind','…')`、`speakFor('kind','…')` 里的字符串字面量。
  - 要说出来的台词必须保持这几种写法，否则不会生成配音文件。
  - **重新生成**：文件名由「角色 + 台词 + `VOICES` 配置」哈希而来，所以改了台词或音色设置都要重新运行脚本。
  - **增量与清理**：脚本会沿用已有文件，删掉不再使用的旧文件；清单只登记真正生成成功的文件。
  - **在哪里生成**：需要 `edge-tts`（`pip3 install -U edge-tts` 或 `pipx install edge-tts`，可用 `EDGE_TTS=路径` 指定；旧版本会被拒绝、返回 403），或者设置 `AZURE_SPEECH_KEY` 和 `AZURE_SPEECH_REGION` 改用 Azure。需要 `ffmpeg` 做后期（切静音、统一峰值）；`POLISH` 常量参与文件名哈希，改后期参数要同时改它。
- **隐私与离线约束。**
  - 运行时不加载任何网络资源，`check_site.py` 发现外部 URL 就会报错。
  - 照片、视频和录音只以本地 blob URL 存在，从不上传。
- **发布采用白名单。**
  - `package_site.py` 里有 `PAGES` 和 `ASSETS` 两个列表；`assets/sfx/` 下的全部文件和 `assets/voice/` 里非空的 MP3 会自动收进去。
  - 新增其他运行时文件必须登记，否则 `check_site.py` 会报 "unpublished or missing resource"。
  - `dist/` 和离线包都是构建产物，已加入 gitignore。

## 测试约定

- `.cjs` 检查脚本在 `vm` 里运行真实源码，DOM、Audio、Speech 都是手写的模拟对象，不使用 jsdom。
- `check_play.cjs` 会为 `index.html` 里每个 `id="…"` 生成一个模拟元素，`PartyAudio` 和 `PartyVoice` 的模拟对象也写在这个文件里。`app.js` 开始调用新的接口或元素时，要同步扩展这些模拟对象。
- 测试会截获定时器但不自动执行，需要在测试里手动触发。
- 模拟测试不等于真实浏览器：
  - 画面和声音的实际表现要用无头 Chrome 通过 DevTools 协议验证：一次访问本地 http 服务，一次打开 `file://dist/index.html`。
  - 声音只能检查有没有报错、能否解码、时长多少，没法真的听到，汇报时要说明这一点。

## 素材

- 插画是 AI 生成的 PNG，转换成保留透明度的 WebP（`scripts/optimize_assets.c`）。提示词保存在 `scripts/image-prompts.json`，不发布。
- `assets/deco/` 的毛毡贴纸不是 AI 生图，由 `scripts/make_felt_sprites.mjs` 程序化绘制；`package_site.py` 自动收录该目录下的 WebP。
- 全屏拍照背景（`#photo-booth`，菜单里的「拍照」）：背景只用生图工具生成的完整插画，不用脚本拼贴或绘制。提示词在 `scripts/photo-background-prompts.md`（同时记入 `image-prompts.json`）；生成的 PNG 放进 `assets/photo-backgrounds/`，在 `scripts/make_photo_backgrounds.mjs` 的 `BACKGROUNDS` 和 `app.js` 的 `PHOTO_BACKGROUNDS` 登记，脚本只负责转成 `<名>.webp` 和 `<名>.thumb.webp`。是投到电视上的拍照背景墙：主次清楚、中间偏下给真人留位置，齐齐的每个动作只出现一次。`package_site.py` 只发布该目录下的 WebP。拍照层打开时 `boothOpen()` 为真：`armIdle`/`schedulePhoto`/`resumeVideo` 都不再启动，音乐只听拍照层自己的开关。
- 两张 4K 备用图由 `scripts/export_background.py` 导出。修改标题或火苗位置时，这个脚本里的排版坐标要和 `styles.css` 保持一致。
- 真实音效及其公有领域/CC0 来源记录在 `assets/sfx/README.md`。新增音效时，要在那里写明来源和许可。
