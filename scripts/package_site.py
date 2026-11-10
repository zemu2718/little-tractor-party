"""白名单打包：只发布页面实际使用的资源，不混入开发目录或个人文件。"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil
ROOT=Path(__file__).resolve().parent.parent
PAGES=['index.html','party/index.html','classic/index.html','play/index.html','play/play.css','play/play.js','play/audio.js','.nojekyll']
ASSETS=['little-dragon.svg','cow.svg','chick.svg','red-tractor.svg','play-sky.svg','play-preview.svg','play-preview-4k.png','birthday-background.svg','birthday-background-4k.png','birthday-cake.svg','birthday-cake-4k.png']
FILES=PAGES+['assets/'+name for name in ASSETS]+['classic/assets/'+name for name in ['birthday-background.svg','birthday-background-4k.png','birthday-cake.svg','birthday-cake-4k.png']]
if __name__=='__main__':
    dist=ROOT/'dist'
    if dist.is_symlink():
        raise SystemExit('dist 不应是符号链接')
    if dist.exists():shutil.rmtree(dist)
    dist.mkdir()
    for name in FILES:
        src=ROOT/name
        if not src.is_file() or src.is_symlink():raise SystemExit('缺少发布文件或文件为链接：'+name)
        target=dist/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,target)
    archive=ROOT/'little-tractor-party-offline.zip'
    with ZipFile(archive,'w',ZIP_DEFLATED) as out:
        for name in FILES+['README.md']:
            out.write(ROOT/name,name)
    shutil.copy2(archive,dist/archive.name)
    print(f'已生成 dist/（{len(FILES)} 个站点文件）与 {archive.name}（{archive.stat().st_size/1024/1024:.1f} MB）')
