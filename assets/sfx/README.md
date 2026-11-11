# 真实音效

把录音放进这个文件夹，再在 `sfx.js` 里登记即可，页面会优先播放真实录音，加载失败时自动用合成音。

## 已收录（均为公有领域，可自由使用）

| 文件 | 用途 | 来源 |
|---|---|---|
| rooster-small.mp3 | 公鸡爸爸打鸣 | Wikimedia Commons「Small rooster crowing.ogg」，作者 alys（原载 pdsounds.org），Public domain |
| rooster-medium.mp3 | 公鸡爸爸打鸣（第二段，轮流播放） | Wikimedia Commons「Medium rooster crowing.ogg」，作者 alys（原载 pdsounds.org），Public domain |
| party-blowout.mp3 | 撒花时的派对吹龙，叠加在合成礼炮声上 | Wikimedia Commons「Luftrüssel.ogg」，作者 Flo Sorg，Public domain |
| cheer-hurray.mp3 | 吹灭蜡烛后的欢呼加鼓掌（截取 1.0–4.8 秒，淡入淡出，响度标准化） | Wikimedia Commons「Clapping hurray.ogg」，Public domain |
| cheer-short.mp3 | “找到啦”时的短欢呼，叠加合成铃声（截取 1.55–3.35 秒） | 同上「Clapping hurray.ogg」，Public domain |
| applause.mp3 | 吹灭蜡烛后的掌声（第二段，轮流播放；截取 1.4–7.0 秒） | Wikimedia Commons「Applause ii.ogg」，Public domain |
| pop.mp3 | 戳破气球、泡泡时的“啵”（三段，各约 0.24 秒，轮流播放） | Wikimedia Commons「Mouth pop.ogg」，Public domain |


以下来自 Freesound.org，均为 **CC0**（公有领域贡献，免署名，这里仍记录来源）。使用的是网站公开的高质量预览 MP3，截取后把峰值统一到 -2 dBFS：

| 文件 | 用途 | 来源 |
|---|---|---|
| horn-triple.mp3 | 小挖掘机按喇叭“嘟嘟嘟”（截取 0.03–1.05 秒） | 「Bicycle / Bike Horn - Triple Honk 2」by manofham，https://freesound.org/s/700137/ |
| horn-vintage.mp3 | 喇叭第二段，轮流播放 | 「Honk! (Vintage Bicycle Horn)」by Breviceps，https://freesound.org/s/468441/ |
| mouse-squeak.mp3 | 鼠妈妈“吱吱”（两段玩具吱吱声拼接） | 「Squeaky Toy 6」by qubodup，https://freesound.org/s/861824/ ；「Squeaky Toy #1」by Breviceps，https://freesound.org/s/468443/ |
| engine-start.mp3 | 点挖掘机：发动机启动轰隆隆（截取 0.15–2.3 秒） | 「tractor-engine-start.wav」by radwoc，https://freesound.org/s/256808/ |
| engine-diesel.mp3 | 点挖掘机第二段，轮流播放（截取 0.12–1.9 秒） | 「diesel engine start.wav」by ElGeorgia，https://freesound.org/s/241756/ |
| excavator-rumble.mp3 | 小挖掘机开过、换场景时的轰鸣，叠加合成音（截取 0.5–2.5 秒） | 「Excavator 4.wav」by eZZin，https://freesound.org/s/606943/ |

截取与标准化用的是 ffmpeg，例如：

```bash
ffmpeg -ss 1.0 -t 3.8 -i Clapping_hurray.ogg -af "afade=t=in:d=0.08,afade=t=out:st=3.0:d=0.8,loudnorm=I=-16:TP=-1.5:LRA=11" -ac 1 -c:a libmp3lame -b:a 96k cheer-hurray.mp3
```

## 建议补充

在 Freesound.org 搜索时勾选 **CC0** 许可（免署名）；Pixabay 音效也可免署名使用。小龙目前仍用合成的可爱“嗷呜”：找到的怪兽叫声都偏吓人，不适合两岁宝宝。

| 登记的键 | 建议搜索词 | 建议长度 |
|---|---|---|
| dragon | cute monster roar / baby dinosaur | 1 秒 |

示例：`mouse:[{src:'mouse.mp3',gain:.8}]`。使用 CC-BY 素材时，请在上表写明作者与链接。
