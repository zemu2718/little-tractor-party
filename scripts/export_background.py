"""从主画面导出静态 SVG 和 3840×2160 PNG；需系统安装 librsvg 与 Cairo。"""
import ctypes as C
import ctypes.util
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
exports = []
for version, dest in [('party','assets'), ('classic','classic/assets')]:
    source = (ROOT / version / 'index.html').read_text()
    scenes = re.findall(r'<svg\b[\s\S]*?</svg>', source)
    assets = ROOT / dest
    assets.mkdir(exist_ok=True)
    for svg, name in zip(scenes, ['birthday-background', 'birthday-cake'], strict=True):
        svg = svg.replace('class="scene"', 'width="3840" height="2160"')
        svg = svg.replace(' style="display:none"', '')
        svg = svg.replace('aria-hidden="true"', 'role="img" aria-label="齐齐两岁生日背景"')
        (assets / f'{name}.svg').write_text(svg)
        exports.append((svg, assets / name))
preview = (ROOT / 'assets/play-preview.svg').read_text()
exports.append((preview, ROOT / 'assets/play-preview'))

def library(name):
    path = ctypes.util.find_library(name)
    if not path:
        raise SystemExit(f'PNG 导出需要系统库 {name}；静态 SVG 已生成。')
    return C.CDLL(path)

def bind(lib, name, args, result):
    fn = getattr(lib, name)
    fn.argtypes, fn.restype = args, result
    return fn

rsvg, cairo, gobject = library('rsvg-2'), library('cairo'), library('gobject-2.0')
ptr = C.c_void_p
load = bind(rsvg, 'rsvg_handle_new_from_data', [C.c_char_p, C.c_size_t, ptr], ptr)
render = bind(rsvg, 'rsvg_handle_render_document', [ptr, ptr, ptr, ptr], C.c_int)
create_surface = bind(cairo, 'cairo_image_surface_create', [C.c_int, C.c_int, C.c_int], ptr)
create_context = bind(cairo, 'cairo_create', [ptr], ptr)
write_png = bind(cairo, 'cairo_surface_write_to_png', [ptr, C.c_char_p], C.c_int)
destroy_context = bind(cairo, 'cairo_destroy', [ptr], None)
destroy_surface = bind(cairo, 'cairo_surface_destroy', [ptr], None)
unref = bind(gobject, 'g_object_unref', [ptr], None)
class Rectangle(C.Structure):
    _fields_ = [(n, C.c_double) for n in ('x', 'y', 'width', 'height')]

for svg, name in exports:
    data = svg.encode()
    handle = load(data, len(data), None)
    if not handle:
        raise SystemExit('SVG 加载失败')
    surface = create_surface(0, 3840, 2160)
    context = create_context(surface)
    try:
        if not render(handle, context, C.byref(Rectangle(0, 0, 3840, 2160)), None):
            raise RuntimeError('SVG 渲染失败')
        if write_png(surface, str(name.parent / f'{name.name}-4k.png').encode()) != 0:
            raise RuntimeError('PNG 写入失败')
    finally:
        destroy_context(context)
        destroy_surface(surface)
        unref(handle)
    print(f'已导出 {name.relative_to(ROOT)}-4k.png')
