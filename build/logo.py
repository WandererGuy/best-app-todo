# Vẽ logo Lumos: python build/logo.py icons <ảnh-xem-thử.png> (cần Pillow)
# Ghi icons/lumos.svg (sidebar), lumos.ico (favicon), lumos-192.png và lumos-512.png (app cài từ Chrome).
import math, os, sys
from PIL import Image, ImageDraw, ImageFilter

out, preview = sys.argv[1:3]
N = 1024
TOP, BOT = (40, 36, 96), (12, 12, 34)        # nền đêm, cùng tông chàm với --acc
GLOW = (255, 214, 140)
HALO, CORE = (255, 226, 160), (255, 250, 236)
WAND = (226, 208, 182)
ORB = (604, 404)                              # quả cầu sáng ở đầu đũa
WAND_LINE = [(292, 772), (540, 470)]
SPARKS = [(800, 236, 52), (372, 276, 34), (812, 612, 28)]   # (x, y, cỡ) các ngôi sao bốn cánh

def star(cx, cy, r):
    # sao bốn cánh: đỉnh dài r theo trục, eo hẹp ở góc chéo
    return [(cx + (r if i % 2 == 0 else r * .28) * math.cos(math.pi / 4 * i - math.pi / 2),
             cy + (r if i % 2 == 0 else r * .28) * math.sin(math.pi / 4 * i - math.pi / 2)) for i in range(8)]

mask = Image.new('L', (N, N), 0)
ImageDraw.Draw(mask).rounded_rectangle([40, 40, N - 40, N - 40], radius=220, fill=255)
img = Image.new('RGBA', (N, N))
g = ImageDraw.Draw(img)
for y in range(N):
    t = y / (N - 1)
    g.line([(0, y), (N, y)], fill=tuple(round(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3)) + (255,))
glow = Image.new('RGBA', (N, N), GLOW + (0,))
ImageDraw.Draw(glow).ellipse([ORB[0] - 230, ORB[1] - 230, ORB[0] + 230, ORB[1] + 230], fill=GLOW + (150,))
img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(90)))
d = ImageDraw.Draw(img)
d.line(WAND_LINE, fill=WAND, width=56)
for x, y in WAND_LINE: d.ellipse([x - 28, y - 28, x + 28, y + 28], fill=WAND)   # đầu bo tròn
for r, c in [(112, HALO), (72, CORE)]:
    d.ellipse([ORB[0] - r, ORB[1] - r, ORB[0] + r, ORB[1] + r], fill=c)
for s in SPARKS: d.polygon(star(*s), fill=CORE)
logo = Image.new('RGBA', (N, N), (0, 0, 0, 0))
logo.paste(img, (0, 0), mask)

logo.resize((256, 256), Image.LANCZOS).save(os.path.join(out, 'lumos.ico'),
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
for n in (192, 512): logo.resize((n, n), Image.LANCZOS).save(os.path.join(out, f'lumos-{n}.png'))
logo.resize((512, 512), Image.LANCZOS).save(preview)

hexc = lambda c: '#%02x%02x%02x' % c
pts = lambda p: ' '.join(f'{x:.0f},{y:.0f}' for x, y in p)
(x1, y1), (x2, y2) = WAND_LINE
open(os.path.join(out, 'lumos.svg'), 'w').write(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 40 944 944"><defs>'
    f'<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{hexc(TOP)}"/><stop offset="1" stop-color="{hexc(BOT)}"/></linearGradient>'
    f'<radialGradient id="l"><stop offset="0" stop-color="{hexc(GLOW)}" stop-opacity=".6"/><stop offset=".45" stop-color="{hexc(GLOW)}" stop-opacity=".22"/>'
    f'<stop offset="1" stop-color="{hexc(GLOW)}" stop-opacity="0"/></radialGradient>'
    '<clipPath id="c"><rect x="40" y="40" width="944" height="944" rx="220"/></clipPath></defs>'
    '<rect x="40" y="40" width="944" height="944" rx="220" fill="url(#g)"/>'
    f'<circle cx="{ORB[0]}" cy="{ORB[1]}" r="380" fill="url(#l)" clip-path="url(#c)"/>'
    f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{hexc(WAND)}" stroke-width="56" stroke-linecap="round"/>'
    f'<circle cx="{ORB[0]}" cy="{ORB[1]}" r="112" fill="{hexc(HALO)}"/><circle cx="{ORB[0]}" cy="{ORB[1]}" r="72" fill="{hexc(CORE)}"/>'
    + ''.join(f'<polygon points="{pts(star(*s))}" fill="{hexc(CORE)}"/>' for s in SPARKS) + '</svg>\n')
