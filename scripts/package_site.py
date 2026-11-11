"""仅打包单一生图版本，不包含旧版本、开发脚本及私人素材。"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil
ROOT=Path(__file__).resolve().parent.parent
PAGES=['index.html','styles.css','app.js','audio.js','voice.js','manifest.webmanifest','.nojekyll']
ASSETS=['little-dragon.webp','little-mouse.webp','little-rooster.webp','little-excavator.webp','birthday-title.webp','album-title.webp','family-title.webp','candle-flame.webp','party-family-final.webp','cake-family.webp','play-sky.webp','birthday-background-4k.png','birthday-cake-4k.png','app-icon.png']
# 真实音效：assets/sfx/ 下的清单、说明与音频全部打包，家长自己加的文件也会带上。
SFX=sorted('assets/sfx/'+p.name for p in (ROOT/'assets/sfx').glob('*') if p.is_file() and not p.name.startswith('.') and p.suffix.lower() in {'.js','.md','.mp3','.m4a','.ogg','.wav','.webm'})
# 预生成台词配音：只打包清单里用到的 MP3。
VOICE=['assets/voice/voice.js']+sorted('assets/voice/'+p.name for p in (ROOT/'assets/voice').glob('*.mp3') if p.is_file() and p.stat().st_size>0)
# 毛毡装饰贴纸（scripts/make_felt_sprites.mjs 生成）。
DECO=sorted('assets/deco/'+p.name for p in (ROOT/'assets/deco').glob('*.webp') if p.is_file())
# 全屏拍照背景（scripts/make_photo_backgrounds.mjs 生成）：只发布 WebP，源 PNG 和动作抠图不发布。
PHOTO_BG=sorted('assets/photo-backgrounds/'+p.name for p in (ROOT/'assets/photo-backgrounds').glob('*.webp') if p.is_file())
FILES=PAGES+['assets/'+name for name in ASSETS]+DECO+PHOTO_BG+SFX+VOICE
if __name__=='__main__':
 dist=ROOT/'dist'
 if dist.is_symlink():raise SystemExit('dist 不应是符号链接')
 if dist.exists():shutil.rmtree(dist)
 dist.mkdir()
 for name in FILES:
  src=ROOT/name
  if not src.is_file() or src.is_symlink():raise SystemExit('缺少发布文件或文件为链接：'+name)
  target=dist/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,target)
 archive=ROOT/'little-tractor-party-offline.zip'
 with ZipFile(archive,'w',ZIP_DEFLATED) as out:
  for name in FILES+['README.md']:
   if name=='index.html':
    offline=(ROOT/name).read_text().replace('<a href="little-tractor-party-offline.zip" download>完整离线包</a>','<span class="help">当前为完整离线副本</span>')
    out.writestr(name,offline)
   else:out.write(ROOT/name,name)
 with ZipFile(archive) as check:
  if check.testzip():raise SystemExit('离线包校验失败')
 shutil.copy2(archive,dist/archive.name)
 print(f'已生成单一版本 dist/（{len(FILES)} 个文件）及离线包（{archive.stat().st_size/1024/1024:.1f} MB）')
