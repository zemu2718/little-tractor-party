"""将生图背景、透明艺术字和火苗按网页坐标排版导出为 4K 备用 PNG。
不绘制 SVG；原始生图分辨率保留，4K 指最终排版画布尺寸。
需要系统 Cairo；普通使用与发布直接使用已导出的 PNG。
"""
from pathlib import Path
import ctypes as C
import ctypes.util
import struct
ROOT=Path(__file__).resolve().parent.parent
lib=ctypes.util.find_library('cairo')
if not lib:raise SystemExit('重新导出备用图需要系统 Cairo；现成图片可直接使用。')
cairo=C.CDLL(lib)
def bind(name,args,result):
 fn=getattr(cairo,name);fn.argtypes=args;fn.restype=result;return fn
ptr=C.c_void_p;num=C.c_double
create=bind('cairo_image_surface_create',[C.c_int,C.c_int,C.c_int],ptr)
load=bind('cairo_image_surface_create_from_png',[C.c_char_p],ptr)
status=bind('cairo_surface_status',[ptr],C.c_int)
context=bind('cairo_create',[ptr],ptr)
save=bind('cairo_save',[ptr],None);restore=bind('cairo_restore',[ptr],None)
translate=bind('cairo_translate',[ptr,num,num],None);scale=bind('cairo_scale',[ptr,num,num],None)
source=bind('cairo_set_source_surface',[ptr,ptr,num,num],None);paint=bind('cairo_paint',[ptr],None)
write=bind('cairo_surface_write_to_png',[ptr,C.c_char_p],C.c_int)
free=bind('cairo_surface_destroy',[ptr],None);destroy=bind('cairo_destroy',[ptr],None)
def draw(ctx,name,x,y,w,h):
 path=ROOT/'assets'/name;data=path.read_bytes();iw,ih=struct.unpack('>II',data[16:24]);img=load(str(path).encode())
 if status(img):raise RuntimeError(f'无法读取图片：{name}')
 save(ctx);translate(ctx,x,y);scale(ctx,w/iw,h/ih);source(ctx,img,0,0);paint(ctx);restore(ctx);free(img)
for background,filename,cake in [('party-family-final.png','birthday-background-4k.png',False),('cake-family.png','birthday-cake-4k.png',True)]:
 surface=create(0,3840,2160);ctx=context(surface)
 try:
  scale(ctx,2.4,2.4)
  draw(ctx,background,0,0,1600,900)
  draw(ctx,'birthday-title.png',256,-45,1088,1088/3)
  if cake:draw(ctx,'candle-flame.png',759.2,219.6,86.4,86.4)
  if write(surface,str(ROOT/'assets'/filename).encode()):raise RuntimeError('导出失败')
 finally:destroy(ctx);free(surface)
 print('已导出 assets/'+filename)
