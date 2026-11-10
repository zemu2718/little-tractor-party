"""构建游乐园矢量画面与角色，复用派对版角色和原参考页红色拖拉机。"""
from pathlib import Path
import re
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent
ET.register_namespace('', 'http://www.w3.org/2000/svg')
party=(ROOT/'party/index.html').read_text()
farm=ET.fromstring(re.search(r'<svg\b[\s\S]*?</svg>',party).group())
ns={'s':'http://www.w3.org/2000/svg'}
defs=farm.find('s:defs',ns)
for name in ['cow','chick']:
    group=next(x for x in defs if x.get('id')=='farm-'+name)
    inner=ET.tostring(group,encoding='unicode')
    gradients=''.join(ET.tostring(x,encoding='unicode') for x in defs if x.tag.endswith('Gradient'))
    (ROOT/f'assets/{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -120 200 230"><defs>{gradients}</defs>{inner}</svg>')
dragon=re.sub(r'^<svg[^>]*>|</svg>$','',(ROOT/'assets/little-dragon.svg').read_text())
# 红色拖拉机图形已保存在项目内，后续维护不依赖外部参考文件。
tractor=(ROOT/'assets/red-tractor.svg').read_text()
tractor=re.sub(r'^<svg[^>]*>|</svg>$','',tractor)
sky='''<defs><linearGradient id="play-sky" x2="0" y2="1"><stop stop-color="#89d8ed"/><stop offset="1" stop-color="#e4f5df"/></linearGradient><g id="play-cloud" fill="#fffef2"><path d="M0 50q-15-45 37-43 25-56 64-8 58-11 55 51Z"/></g></defs>
<path d="M0 0h1600v900H0Z" fill="url(#play-sky)"/>
<g fill="none" stroke-width="22" opacity=".45"><path d="M1100 500a360 360 0 0 1 720 0" stroke="#efad82"/><path d="M1130 500a330 330 0 0 1 660 0" stroke="#ffe195"/><path d="M1160 500a300 300 0 0 1 600 0" stroke="#94cdaa"/></g>
<g class="play-cloud"><use href="#play-cloud" x="220" y="305"/><use href="#play-cloud" x="1280" y="320"/></g><g class="play-cloud two"><use href="#play-cloud" x="880" y="365"/></g>
<g transform="translate(139 150)"><g stroke="#f8d576" stroke-width="10" stroke-linecap="round"><path d="M0-91v-19m0 201v19m91-110h19m-201 0h-19m45-65-14-14m144 144 14 14m-14-144 14-14M-65 65l-14 14"/></g><circle r="70" fill="#ffe28a"/><circle cx="-22" cy="-5" r="6" fill="#996f3b"/><circle cx="22" cy="-5" r="6" fill="#996f3b"/><path d="M-19 20q19 21 38 0" stroke="#996f3b" stroke-width="5" fill="none" stroke-linecap="round"/></g>
<path d="M0 580Q300 400 700 570T1600 520V900H0Z" fill="#b8dba1"/><path d="M0 695Q420 490 850 675T1600 600V900H0Z" fill="#82bd88"/><path d="M-30 875Q500 700 1640 800" fill="none" stroke="#f5d59e" stroke-width="150"/>
<g fill="#fff9db"><path d="M20 660h1550v13H20Z"/><path d="M20 697h1550v12H20Z"/><path d="M45 640h12v93H45Zm90 0h12v93h-12Zm90 0h12v93h-12Zm1100 0h12v93h-12Zm90 0h12v93h-12Zm90 0h12v93h-12Z"/></g>
<g fill="#fff5bd"><circle cx="95" cy="820" r="9"/><circle cx="1510" cy="785" r="9"/><circle cx="1450" cy="855" r="8"/><circle cx="205" cy="845" r="8"/></g>'''
scene=sky+'''<g text-anchor="middle" font-family="PingFang SC,Microsoft YaHei,Noto Sans CJK SC,sans-serif"><text x="820" y="118" font-size="24" letter-spacing="7" fill="#326a64">小龙和齐齐的快乐农场</text><text x="820" y="229" font-size="85" font-weight="900" fill="#27664d" stroke="#fffdf0" stroke-width="12" paint-order="stroke">齐齐，2 岁快乐！</text><rect x="580" y="270" width="480" height="58" rx="29" fill="#fff5d6"/><text x="820" y="310" font-size="28" fill="#946933">嘟嘟！开往快乐的每一天</text></g>
<g class="play-train"><ellipse cx="800" cy="807" rx="490" ry="23" fill="#577c53" opacity=".2"/>
<path d="M690 731h185" stroke="#6d7456" stroke-width="16"/>
<path d="M300 669h440l-24 101H325Z" fill="#dcaa60" stroke="#b88245" stroke-width="5"/><path d="M310 707h422m-412 33h405" stroke="#b88245" stroke-width="5"/>
<g fill="#365548" stroke="#edc467" stroke-width="19"><circle cx="382" cy="778" r="37"/><circle cx="659" cy="778" r="37"/></g>
<svg x="405" y="418" width="265" height="265" viewBox="0 0 300 300">'''+dragon+'''</svg>
<text x="351" y="679" font-family="sans-serif" font-size="190" font-weight="900" fill="#ffd668" stroke="#fff3c3" stroke-width="8" paint-order="stroke">2</text>
<svg x="775" y="424" width="535" height="389" viewBox="0 0 220 160">'''+tractor+'''</svg></g>'''
(ROOT/'assets/play-preview.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">'+scene+'</svg>')
(ROOT/'assets/play-sky.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">'+sky+'</svg>')

page=ROOT/'play/index.html'
if page.exists():
    doc=page.read_text()
    preview=(ROOT/'assets/play-preview.svg').read_text().replace('<svg ', '<svg aria-hidden="true" ',1)
    doc=re.sub(r'<!-- HOME_ART_START -->[\s\S]*?<!-- HOME_ART_END -->', lambda _: '<!-- HOME_ART_START -->'+preview+'<!-- HOME_ART_END -->', doc)
    page.write_text(doc)
