"""用本机 Whisper 把每段预生成配音转写成文字，和台词逐句对照（只在本机运行，不联网，不发布）。

用法（macOS，需已安装 openai-whisper 和模型）：
    python3 scripts/check_voice_asr.py [--model large-v3] > /tmp/voice-asr.json
输出 JSON：[{key, file, expect, heard, score}]，score 为去掉标点后的字符相似度（0–1）。
不给 Whisper 提示台词原文，避免它“照着念”掩盖错读。
注意：单独一个字（如倒数的“二！”）Whisper 常听成“啊”，要把整段倒数拼起来再听。
"""
import json, re, sys, difflib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
model_name = sys.argv[sys.argv.index('--model') + 1] if '--model' in sys.argv else 'large-v3'

text = (ROOT / 'assets/voice/voice.js').read_text()
manifest = json.loads(text[text.index('{'):text.rindex('}') + 1])

# Whisper 常输出繁体或同音字，比较前做最小的繁简归一。
T2S = str.maketrans('齊來啦長樂蠟燭貓爺媽龍機掘雞歲歡將這個們會麼裡哪找轉舞樣說話謝謝親愛寶貝歌願許兒數兩拋躲貓開',
                    '齐来啦长乐蜡烛猫爷妈龙机掘鸡岁欢将这个们会么里哪找转舞样说话谢谢亲爱宝贝歌愿许儿数两抛躲猫开')
# 同音或近音的写法差异（Whisper 常写成别的字），不算错读。
HOMOPHONES = [('琪', '齐'), ('奇', '齐'), ('了', '啦'), ('啊', '呀'), ('挖', '哇'), ('攻击', '公鸡'), ('字', '吱'), ('滋', '吱'), ('知', '吱'), ('枝', '吱'), ('琴', '亲'), ('的', '得'), ('毫无', '嗷呜'), ('1', '一'), ('2', '二'), ('3', '三')]
def norm(s):
    s = re.sub(r'[\s，。！？、,.!?…—\-~～：:；;“”"\'（）()]', '', s.translate(T2S))
    for a, b in HOMOPHONES:
        s = s.replace(a, b)
    return s

import whisper
model = whisper.load_model(model_name)
out = []
for key, file in manifest.items():
    expect = key.split('|', 1)[1]
    r = model.transcribe(str(ROOT / 'assets/voice' / file), language='zh', fp16=False, temperature=0, condition_on_previous_text=False)
    heard = r['text'].strip()
    score = difflib.SequenceMatcher(None, norm(expect), norm(heard)).ratio()
    out.append({'key': key, 'file': file, 'expect': expect, 'heard': heard, 'score': round(score, 2)})
    print(f'{score:.2f}  {expect}  ->  {heard}', file=sys.stderr, flush=True)
print(json.dumps(out, ensure_ascii=False, indent=1))
