/* 真实音效清单：放进 assets/sfx/ 的录音在这里登记，没登记或加载失败时自动退回合成音。
 * 键名对应音效种类：rooster 公鸡、mouse 老鼠、dragon 小龙、excavator 挖掘机（点击）、drive 挖掘机开过、
 *   honk 喇叭、pop 泡泡/气球破、party 撒花、found 找到啦、applause 吹灭蜡烛后的欢呼鼓掌、puff 吹蜡烛、twinkle 点击星星、beep 倒数。
 * 每项可写：src 文件名；start/end 只播放其中几秒（秒）；gain 音量（1 为原始音量）；
 *   mix:true 表示和合成音一起播放（默认替换合成音）。同一种类写多段时轮流播放。
 * 推荐 MP3，单段 1–2 秒、几十 KB 即可；来源与许可见 README.md。 */
window.PARTY_SFX={
 rooster:[
  {src:'rooster-small.mp3',start:2.5,end:4.3,gain:1},
  {src:'rooster-medium.mp3',start:2.85,end:5.3,gain:.9}
 ],
 party:[{src:'party-blowout.mp3',start:.5,end:1.8,gain:.55,mix:true}],
 // 欢呼鼓掌：找到啦用短的一段并叠加合成铃声；吹灭蜡烛后用完整的欢呼和掌声轮流。
 found:[{src:'cheer-short.mp3',gain:.55,mix:true}],
 applause:[{src:'cheer-hurray.mp3',gain:.8},{src:'applause.mp3',gain:.9}],
 // 嘴巴“啵”的真实录音，三段轮流。
 pop:[{src:'pop.mp3',start:0,end:.24,gain:.9},{src:'pop.mp3',start:.26,end:.5,gain:.9},{src:'pop.mp3',start:.52,end:.76,gain:.9}]
};
