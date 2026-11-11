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

截取与标准化用的是 ffmpeg，例如：

```bash
ffmpeg -ss 1.0 -t 3.8 -i Clapping_hurray.ogg -af "afade=t=in:d=0.08,afade=t=out:st=3.0:d=0.8,loudnorm=I=-16:TP=-1.5:LRA=11" -ac 1 -c:a libmp3lame -b:a 96k cheer-hurray.mp3
```

## 建议补充

在 Freesound.org 搜索时勾选 **CC0** 许可（免署名）；Pixabay 音效也可免署名使用。Wikimedia Commons 上暂未找到合适的公有领域挖掘机/玩具喇叭录音。

| 登记的键 | 建议搜索词 | 建议长度 |
|---|---|---|
| mouse | cartoon mouse squeak / squeaky toy | 0.5–1 秒 |
| excavator、drive | excavator engine / tractor start / toy truck | 1–2 秒 |
| honk | toy car horn / clown horn | 0.5 秒 |
| dragon | cute monster roar / baby dinosaur | 1 秒 |

示例：`mouse:[{src:'mouse.mp3',gain:.8}]`。使用 CC-BY 素材时，请在上表写明作者与链接。
