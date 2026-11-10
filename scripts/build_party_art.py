"""构建派对版内嵌 SVG；复用简洁版的拖拉机，保持无外部素材依赖。"""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parent.parent
classic=(ROOT/'classic/index.html').read_text()
farm=re.search(r'<svg\b[\s\S]*?</svg>',classic).group()
tractor=farm[farm.index('<g><path d="M354'):farm.index('<!-- 前景花草 -->')]
tractor=tractor.replace('#64875b','url(#green)').replace('#e1e6c5','url(#glass)').replace('#3c654b','#236743').replace('#3e654c','#236743').replace('#a9bd82','#c2e78d')
tractor=tractor.replace('<path d="M598 478v100"','<path d="M554 486l38 0-38 45Z" fill="#fff" opacity=".6"/><path d="M598 478v100"')
number='M890 465C894 361 1082 362 1082 464C1082 510 1048 537 999 570L964 595H1085V643H888V600L973 530C1013 498 1029 485 1029 463C1029 427 950 423 947 468Z'

def defs():
 return '''<defs>
<linearGradient id="sky" x2="0" y2="1"><stop stop-color="#fff1cc"/><stop offset="1" stop-color="#fffdf0"/></linearGradient>
<linearGradient id="green" x2=".2" y2="1"><stop stop-color="#89ca60"/><stop offset=".45" stop-color="#51a75b"/><stop offset="1" stop-color="#28734a"/></linearGradient>
<linearGradient id="gold" x2=".7" y2="1"><stop stop-color="#ffe89b"/><stop offset=".45" stop-color="#ffc84e"/><stop offset="1" stop-color="#e8a52b"/></linearGradient>
<linearGradient id="glass" x2="1" y2="1"><stop stop-color="#edf8de"/><stop offset="1" stop-color="#b0d9bb"/></linearGradient>
<linearGradient id="wood" x2="0" y2="1"><stop stop-color="#e7b870"/><stop offset="1" stop-color="#b97b3e"/></linearGradient>
<linearGradient id="cream" x2="0" y2="1"><stop stop-color="#fffef4"/><stop offset="1" stop-color="#f4dfad"/></linearGradient>
<radialGradient id="balloon-g" cx=".3" cy=".25" r=".8"><stop stop-color="#a5da76"/><stop offset=".7" stop-color="#56a866"/><stop offset="1" stop-color="#33834e"/></radialGradient>
<radialGradient id="balloon-y" cx=".3" cy=".25" r=".8"><stop stop-color="#fff3a6"/><stop offset=".7" stop-color="#f9ca4b"/><stop offset="1" stop-color="#e9a536"/></radialGradient>
<radialGradient id="balloon-o" cx=".3" cy=".25" r=".8"><stop stop-color="#ffd6a5"/><stop offset=".7" stop-color="#eea26d"/><stop offset="1" stop-color="#d98254"/></radialGradient>
<pattern id="gingham" width="38" height="38" patternUnits="userSpaceOnUse"><rect width="38" height="38" fill="#fff4d9"/><path d="M0 10h38M10 0v38" stroke="#eac571" stroke-width="18" opacity=".22"/></pattern>
<g id="star"><path d="M0-16 5-5 17-4 8 4 10 17 0 10-10 17-8 4-17-4-5-5Z" fill="#eab648"/></g>
<g id="cloud" fill="#fffef4"><path d="M0 38C-12 12 18-3 37 12C47-18 93-12 102 16C132 0 157 23 144 40Z"/></g>
<g id="tire"><circle r="70" fill="#283e35"/><circle cy="-2" r="61" fill="#405748"/><circle r="62" fill="none" stroke="#283e35" stroke-width="11" stroke-dasharray="8 12"/><circle cy="-1" r="40" fill="#ffdc79"/><circle r="28" fill="#d99d38"/><circle cy="-2" r="18" fill="#ffdc79"/><circle cy="-2" r="8" fill="#ffedaf"/><g fill="#f9e8ac"><circle cy="-27" r="4"/><circle cy="26" r="4"/><circle cx="-26" r="4"/><circle cx="26" r="4"/></g></g>
<g id="sunflower"><path d="M0 0v97m0-26q-47-2-44-34 32-4 44 34m0-14q41 0 43-30-36-4-43 30" fill="#64a05b" stroke="#3f8250" stroke-width="5"/>
'''+''.join(f'<ellipse cy="-24" rx="12" ry="27" fill="url(#gold)" transform="rotate({a})"/>' for a in range(0,360,30))+'''<circle r="24" fill="#925b38"/><circle r="17" fill="#b37a40"/><g fill="#e0aa5a"><circle cx="-7" cy="-6" r="2"/><circle cx="5" cy="-9" r="2"/><circle cx="10" cy="3" r="2"/><circle cy="10" r="2"/><circle cx="-10" cy="5" r="2"/></g></g>
<g id="chick"><ellipse cy="28" rx="40" ry="35" fill="url(#gold)"/><circle cy="-12" r="34" fill="#ffe184"/><path d="M-22-37 0-79 22-37Z" fill="#ec9c6a"/><path d="M-13-55h26" stroke="#fff2c6" stroke-width="7"/><circle cy="-81" r="7" fill="#fff5d9"/><path d="M-30 13q-23-10-22 11t26 12" fill="#f3bc4d"/><circle cx="-11" cy="-16" r="4" fill="#354b3c"/><circle cx="12" cy="-16" r="4" fill="#354b3c"/><path d="M-7-5h15L1 3Z" fill="#d78345"/><ellipse cx="-23" cy="-5" rx="6" ry="4" fill="#f1ad7d"/><ellipse cx="23" cy="-5" rx="6" ry="4" fill="#f1ad7d"/><path d="M-13 57v10h-12m38-10v10h12" fill="none" stroke="#bd7f3d" stroke-width="5" stroke-linecap="round"/></g>
<g id="cow"><ellipse cy="42" rx="48" ry="44" fill="#fff7e7"/><path d="M-24 19q-27 9-19 31 20 16 30-5 8-17-11-26Z" fill="#475e4c"/><path d="M-35-36q-44-23-40 9 8 26 41 10m69-19q44-23 40 9-8 26-41 10" fill="#fff3dc" stroke="#ceb88e" stroke-width="3"/><path d="M-38-44l-10-24q21 3 20 22m67 2 10-24q-21 3-20 22" fill="#d7b57a"/><rect x="-46" y="-57" width="92" height="91" rx="39" fill="#fff9e8"/><path d="M16-54q29 2 28 29-7 21-29 8-11-12 1-37Z" fill="#475e4c"/><circle cx="-20" cy="-19" r="5" fill="#354b3c"/><circle cx="21" cy="-19" r="5" fill="#354b3c"/><ellipse cy="14" rx="38" ry="24" fill="#efbd9e"/><ellipse cx="-15" cy="10" rx="4" ry="5" fill="#b77c5b"/><ellipse cx="15" cy="10" rx="4" ry="5" fill="#b77c5b"/><path d="M-9 23q9 7 18 0" stroke="#b77c5b" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M-23-56 0-105 23-56Z" fill="#76ad67"/><path d="M-14-75h28" stroke="#ffe5a0" stroke-width="8"/><circle cy="-107" r="8" fill="#f5ca58"/><path d="M-19 79v12m38-12v12" stroke="#475e4c" stroke-width="17" stroke-linecap="round"/></g>
</defs>'''

def balloons(x,flip=False):
 # 每簇气球的动画放在内层，外层坐标不受 CSS transform 覆盖。
 return f'<g transform="translate({x} 230) scale({-1 if flip else 1} 1)"><g class="party-balloons">'+'''<g stroke="#bda26a" stroke-width="2" fill="none"><path d="M0 360Q-30 230-40 90M0 360Q50 220 52 150M0 360Q-95 240-91 190M0 360Q5 160 5 15"/></g>'''+''.join(f'<g transform="translate({cx} {cy}) rotate({r})"><ellipse rx="{rx}" ry="{ry}" fill="url(#balloon-{color})"/><path d="M-5 {ry-2}l-4 10h18l-4-10" fill="url(#balloon-{color})"/><ellipse cx="{-rx*.32}" cy="{-ry*.38}" rx="{rx*.16}" ry="{ry*.24}" fill="#fff" opacity=".5" transform="rotate(25)"/></g>' for cx,cy,rx,ry,color,r in [(-40,65,48,60,'g',-15),(52,126,44,56,'y',15),(-91,173,44,55,'o',-20),(5,-3,42,53,'y',8),(-10,200,35,45,'g',5)])+'''<path d="M0 355q-28-21-30-1 2 20 30 2 28-23 30-2-2 20-30 2" fill="#e4ab59"/></g></g>'''

def header(cake=False):
 return '''<g font-family="PingFang SC, Microsoft YaHei, Noto Sans CJK SC, sans-serif" text-anchor="middle">
<rect x="565" y="35" width="470" height="38" rx="19" fill="#fffdf3" stroke="#e8cc8a" stroke-width="2"/>
<text x="800" y="61" font-size="16" letter-spacing="4" fill="#8d713f">LITTLE FARMER · BIG DAY</text>
<text x="800" y="177" font-size="74" font-weight="bold" letter-spacing="5" stroke="#e0c58c" stroke-width="10" stroke-linejoin="round" paint-order="stroke" fill="#e0c58c">吴思齐 · 2 岁生日快乐</text>
<text x="800" y="169" font-size="74" font-weight="bold" letter-spacing="5" stroke="#fffaf0" stroke-width="10" stroke-linejoin="round" paint-order="stroke" fill="#276344">吴思齐 <tspan fill="#d79530">· 2 岁</tspan>生日快乐</text>
<path d="M500 207h600l-17 23 17 23H500l17-23Z" fill="#e7b75c"/>
<rect x="535" y="202" width="530" height="48" rx="7" fill="#f9dc91"/>
'''+ ('<text id="cake-wish"' if cake else '<text')+''' x="800" y="234" font-size="23" letter-spacing="3" fill="#75603a">'''+('小小的愿望，大大的幸福。' if cake else '两岁，快乐出发！')+'''</text></g>'''

def background(cake=False):
 flags='<path d="M-20 12Q200 150 410 27M1190 27Q1400 150 1620 12" fill="none" stroke="#b09660" stroke-width="3"/>'
 for x,y,r,col in [(25,39,-15,'#6aab68'),(100,67,-8,'#efb547'),(180,82,0,'#e9a078'),(260,75,10,'#6aab68'),(337,54,18,'#efb547')]:
  for xx,rr in [(x,r),(1600-x,-r)]:flags+=f'<path d="M-25 0h50L0 63Z" fill="{col}" stroke="#fff4d8" stroke-width="3" transform="translate({xx} {y}) rotate({rr})"/>'
 return '<path d="M0 0H1600V900H0Z" fill="url(#sky)"/>'+flags+'''<g class="cloud"><use href="#cloud" x="288" y="302"/><use href="#cloud" x="1190" y="382"/></g><g class="cloud two"><use href="#cloud" x="1110" y="272"/></g>
<path d="M0 515Q220 415 470 510T950 505T1600 478V900H0Z" fill="#dce8b7"/>
<path d="M0 606Q300 475 670 584T1150 560T1600 530V900H0Z" fill="#bad398"/>
<path d="M0 732Q300 609 750 709T1600 660V900H0Z" fill="#8bb873"/>
<path d="M0 821Q450 686 850 778T1600 733" stroke="#f2d390" stroke-width="108" fill="none"/>
<path d="M0 865Q450 776 860 843T1600 820V900H0Z" fill="#5d975e"/>
<path d="M0 876H1600V900H0Z" fill="url(#gingham)"/>
'''+balloons(130)+balloons(1470,True)+''.join(f'<use href="#star" transform="translate({x} {y}) scale({z}) rotate({r})"/>' for x,y,z,r in [(360,235,.6,12),(1250,230,.7,-12),(400,360,.7,25),(1195,340,.8,12),(740,340,.5,-8),(1340,550,.7,20)])

def foreground(cake=False):
 out=''
 for x,y,scale,rot in [(105,730,1.25,-12),(200,777,.9,14),(1490,730,1.25,12),(1400,787,.85,-15)]:
  out+=f'<g transform="translate({x} {y}) rotate({rot}) scale({scale})"><use href="#sunflower"/></g>'
 out+='''<g stroke="#eac164" stroke-width="6" fill="none" stroke-linecap="round"><path d="M45 852l-17-133m11 83-22-19m19-2 15-25m-19 2-19-20M1555 852l17-133m-11 83 22-19m-19-2-15-25m19 2 19-20"/></g>'''
 out+='''<g transform="translate(250 780)"><rect width="65" height="52" rx="5" fill="#efaf78"/><path d="M28 0h10v52M0 16h65" fill="none" stroke="#fff0c0" stroke-width="8"/><path d="M33 0q-35-31-34-10 0 15 34 10 33-29 33-10 0 15-33 10" fill="none" stroke="#ffe3a3" stroke-width="6"/></g>'''
 out+='''<g transform="translate(1288 779)"><rect width="65" height="52" rx="5" fill="#e8c259"/><path d="M29 0h8v52M0 15h65" fill="none" stroke="#fff0c0" stroke-width="8"/><path d="M33 0q-35-31-34-10 0 15 34 10 33-29 33-10 0 15-33 10" fill="none" stroke="#fff0c0" stroke-width="6"/></g>'''
 out+='<rect x="500" y="821" width="600" height="43" rx="21" fill="#4d8554"/><text x="800" y="850" text-anchor="middle" font-size="20" letter-spacing="4" fill="#fff7db" font-family="PingFang SC, Microsoft YaHei, Noto Sans CJK SC, sans-serif">'+('愿你眼里有光，每一天都快乐成长。' if cake else '小小拖拉机，载着快乐慢慢长大。')+'</text>'
 return out

def farm_scene():
 art=background()
 art+='''<g transform="translate(210 450) scale(.65)"><path d="M0 60 90 0l90 60v170H0Z" fill="#d28d61"/><path d="M-12 64 90-12 192 64" stroke="#537c53" stroke-width="16" fill="none" stroke-linejoin="round"/><path d="M60 130h60v100H60Z" fill="#fef1c9"/><path d="M66 138h48v92H66Z" fill="#91b17b"/><path d="M66 140l48 86m0-86-48 86" stroke="#fef1c9" stroke-width="5"/><rect x="72" y="58" width="36" height="40" fill="#fff0cc"/></g>
<g class="party-ride"><ellipse cx="825" cy="778" rx="489" ry="25" fill="#497447" opacity=".2"/>
<path d="M735 703h120" stroke="#59764d" stroke-width="14" stroke-linecap="round"/>
<g transform="translate(1190 609) scale(.9)"><use href="#cow"/></g>
<g transform="translate(839 639) scale(.85)"><use href="#chick"/></g>
<path d="M800 683h482l-23 64H822Z" fill="url(#wood)" stroke="#ac783f" stroke-width="3"/>
<path d="M811 707h460m-451 21h444" stroke="#ae7e43" stroke-width="3"/>
<path d="M850 686v56m380-56v56" stroke="#ffdc96" stroke-width="12"/>
<g transform="translate(1060 757)"><g class="party-trailer-wheel"><use href="#tire" transform="scale(.63)"/></g></g>
<g transform="translate(-280 -143) scale(1.3)">'''
 art+=f'<path d="{number}" fill="#ca8830" stroke="#ca8830" stroke-width="6" transform="translate(9 10)"/><path d="{number}" fill="url(#gold)" stroke="#fff2bc" stroke-width="6"/>'
 art+='''<path d="M963 377l-17-29 29 10 15-31 16 31 30-10-15 29" fill="#edae36" stroke="#fff2bc" stroke-width="4" stroke-linejoin="round"/>
<path d="M914 450q10-45 65-43" fill="none" stroke="#fff5cb" stroke-width="9" stroke-linecap="round" opacity=".7"/></g>
<g transform="translate(-79 -113) scale(1.18)">'''+tractor+'''</g>
<g transform="translate(633 522) scale(.45)"><use href="#chick"/></g>'''
 return art+'</g>'+foreground()+header()

def cake_scene():
 art=background(True)
 art+='''<ellipse cx="800" cy="777" rx="406" ry="28" fill="#456f46" opacity=".2"/>
<path d="M752 738h96l21 57H731Z" fill="url(#wood)"/><ellipse cx="800" cy="796" rx="156" ry="15" fill="#d9a95f"/>
<rect x="448" y="723" width="704" height="26" rx="13" fill="#bd853e"/><ellipse cx="800" cy="723" rx="352" ry="20" fill="#ffe6a3"/>
<rect x="482" y="565" width="636" height="156" rx="30" fill="url(#green)"/>
'''+''.join(f'<path d="M{x} 609v86" stroke="#c7e7a0" stroke-width="8" opacity=".35"/>' for x in range(510,1110,35))+'''
<rect x="566" y="434" width="468" height="139" rx="28" fill="url(#gold)"/>
<path d="M566 470v-25q0-24 24-24h420q24 0 24 24v25q-26 34-52 0-26 34-52 0-26 34-52 0-26 34-52 0-26 34-52 0-26 34-52 0-26 34-52 0-26 34-52 0-26 34-52 0Z" fill="url(#cream)"/>
<path d="M482 609v-29q0-25 27-25h582q27 0 27 25v29q-26 37-53 0-26 37-53 0-26 37-53 0-26 37-53 0-26 37-53 0-26 37-53 0-26 37-53 0-26 37-53 0-26 37-53 0-26 37-53 0-26 37-53 0-26 37-53 0Z" fill="url(#cream)"/>
<rect x="676" y="635" width="248" height="59" rx="29" fill="#fff7df" stroke="#e6bb63" stroke-width="3"/>
<text x="800" y="674" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="bold" letter-spacing="4" fill="#3c7950">HAPPY TWO</text>
'''
 # 数字 2 蜡烛与火焰分离，保留既有控制 ID。
 art+='<g transform="translate(357 143) scale(.45)">'+f'<path d="{number}" transform="translate(5 5)" fill="#d18b40"/><path d="{number}" fill="url(#gold)" stroke="#fff9df" stroke-width="8"/>'+'</g>'
 art+='''<path d="M800 314v-5" stroke="#736143" stroke-width="4" stroke-linecap="round"/>
<g id="flames" transform="translate(0 13)"><ellipse cx="800" cy="287" rx="30" ry="34" fill="#ffdc79" opacity=".25"/><path d="M800 259c-6 14-18 21-17 32 1 20 34 20 34 0 1-11-11-19-17-32Z" fill="#edb53d"/><ellipse cx="800" cy="292" rx="7" ry="10" fill="#fff4bb"/></g>
'''
 for x in range(595,1010,46):
  art+=f'<circle cx="{x}" cy="550" r="10" fill="#fff4d6"/>'
 for x in range(511,1100,39):
  art+=f'<circle cx="{x}" cy="710" r="9" fill="#fef1cd"/>'
 for x in [602,674,927,999]:
  art+=f'<g transform="translate({x} 422)"><path d="M-15-13q15-13 30 0 2 17-15 25-17-8-15-25Z" fill="#e49a68"/><path d="M0-13l-12-10 13 4 12-4-10 10" fill="#639151"/><path d="M-6-3v3m13-4v3m-7 3v3" stroke="#ffe6a4" stroke-width="2"/></g>'
 art+='''<g transform="translate(379 670) scale(1.12)"><use href="#cow"/></g><g transform="translate(1230 694) scale(1.12)"><use href="#chick"/></g>
<g transform="translate(610 516) scale(.39)"><use href="#sunflower"/></g><g transform="translate(988 515) scale(.39)"><use href="#sunflower"/></g>'''
 return art+foreground(True)+header(True)

def svg(content,name):
 hidden=' style="display:none"' if name=='cake' else ''
 doc=f'<svg id="{name}-scene" class="scene"{hidden} viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n'+defs()+content+'\n</svg>'
 # 每个场景的资源 ID 独立，导出时也无需依赖另一个 SVG。
 for ident in re.findall(r' id="([^"]+)"',defs()):
  doc=doc.replace(f'id="{ident}"',f'id="{name}-{ident}"').replace(f'#{ident}"',f'#{name}-{ident}"').replace(f'#{ident})',f'#{name}-{ident})')
 return doc
p=ROOT/'party/index.html';source=p.read_text();scenes=iter([svg(farm_scene(),'farm'),svg(cake_scene(),'cake')])
source=re.sub(r'<svg\b[\s\S]*?</svg>',lambda _:next(scenes),source)
p.write_text(source)
print('已生成农场派对与蛋糕派对插画')
