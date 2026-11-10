"""检查发布清单、HTML/CSS 相对路径、SVG 引用及脚本语法（无需第三方依赖）。"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from package_site import ROOT, FILES
errors=[]
class Page(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.links=[];self.scripts=[];self.in_script=False;self.script=''
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'id' in attrs:self.ids.append(attrs['id'])
        for key in ['href','src']:
            if attrs.get(key):self.links.append(attrs[key])
        if tag=='script':self.in_script=True;self.script=''
    def handle_endtag(self,tag):
        if tag=='script':self.in_script=False;self.scripts.append(self.script)
    def handle_data(self,data):
        if self.in_script:self.script+=data

def check_link(source,value,ids=None):
    if value.startswith(('data:','blob:','mailto:','tel:')):return
    parts=urlsplit(value)
    if parts.scheme or parts.netloc:
        errors.append(f'{source}: unexpected external dependency {value}');return
    if parts.path.startswith('/'):
        errors.append(f'{source}: absolute path breaks repository Pages: {value}');return
    dest=(ROOT/source).parent / unquote(parts.path) if parts.path else ROOT/source
    dest=dest.resolve()
    if not dest.is_relative_to(ROOT):errors.append(f'{source}: path escapes site {value}');return
    if parts.path and dest.name!='little-tractor-party-offline.zip' and (not dest.is_file() or str(dest.relative_to(ROOT)) not in FILES):errors.append(f'{source}: unpublished or missing resource {value}')
    if not parts.path and parts.fragment and ids is not None and unquote(parts.fragment) not in ids:errors.append(f'{source}: missing anchor {value}')

for name in FILES:
    p=ROOT/name
    if not p.is_file():errors.append('missing '+name);continue
    if p.suffix=='.html':
        html=p.read_text();page=Page();page.feed(html)
        duplicates={id for id in page.ids if page.ids.count(id)>1}
        if duplicates:errors.append(f'{name}: duplicate IDs {duplicates}')
        for link in page.links:check_link(name,link,page.ids)
        for i,script in enumerate(page.scripts):
            with tempfile.NamedTemporaryFile(suffix='.js',mode='w') as tmp:
                tmp.write(script);tmp.flush();r=subprocess.run(['node','--check',tmp.name],capture_output=True,text=True)
                if r.returncode:errors.append(f'{name}: inline script {i}: {r.stderr}')
        # SVG paint servers must exist in the page.
        for ref in re.findall(r'url\(#([^\)]+)\)',html):
            if ref not in page.ids:errors.append(f'{name}: missing SVG paint server {ref}')
    elif p.suffix=='.css':
        for link in re.findall(r'url\([\'"]?([^\)\'\"]+)',p.read_text()):check_link(name,link)
    elif p.suffix=='.js':
        r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
        if r.returncode:errors.append(r.stderr)
    elif p.suffix=='.svg':
        try:
            root=ET.fromstring(p.read_text());ids={e.get('id') for e in root.iter() if e.get('id')}
            for e in root.iter():
                for k,v in e.attrib.items():
                    if k.endswith('href'):check_link(name,v,ids)
                    for ref in re.findall(r'url\(#([^\)]+)\)',v):
                        if ref not in ids:errors.append(f'{name}: missing SVG definition {ref}')
        except ET.ParseError as e:errors.append(f'{name}: invalid SVG: {e}')
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS: {len(FILES)} publish files, all local links, repository-relative paths, unique HTML IDs, SVG definitions and JS syntax')
