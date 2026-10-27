# Vẽ logo Hearth: python build/logo.py icons/hearth.ico icons/hearth.svg <ảnh-xem-thử.png> (cần Pillow)
import math, sys
from PIL import Image, ImageDraw

ico, svg, preview = sys.argv[1:4]
N = 1024
TOP, BOT = (64, 40, 32), (24, 17, 16)        # nền than ấm
CREAM = (255, 240, 220)
OUTER, INNER = (255, 112, 40), (255, 200, 70)
BARS = [(250, 220, 390, 804), (634, 220, 774, 804), (390, 610, 634, 720)]   # chữ H: hai cột + thanh ngang thấp như khung lò

def drop(cx, cy, a, b, n=64):
    # giọt nước đầu nhọn hướng lên: rộng dần từ đỉnh xuống đáy
    return [(cx + a * math.sin(t) * math.sin(t / 2), cy - b * math.cos(t))
            for t in (2 * math.pi * i / n for i in range(n))]

FLAMES = [(drop(512, 470, 105, 135), OUTER), (drop(512, 515, 58, 85), INNER)]

img = Image.new('RGBA', (N, N), (0, 0, 0, 0))
bg = Image.new('RGBA', (N, N))
g = ImageDraw.Draw(bg)
for y in range(N):
    t = y / (N - 1)
    g.line([(0, y), (N, y)], fill=tuple(round(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3)) + (255,))
mask = Image.new('L', (N, N), 0)
ImageDraw.Draw(mask).rounded_rectangle([40, 40, N - 40, N - 40], radius=220, fill=255)
img.paste(bg, (0, 0), mask)
d = ImageDraw.Draw(img)
for i, b in enumerate(BARS):
    d.rounded_rectangle(b, radius=28 if i < 2 else 0, fill=CREAM)
for pts, c in FLAMES:
    d.polygon(pts, fill=c)

small = img.resize((256, 256), Image.LANCZOS)
small.save(ico, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
img.resize((512, 512), Image.LANCZOS).save(preview)

hexc = lambda c: '#%02x%02x%02x' % c
pts = lambda p: ' '.join(f'{x:.0f},{y:.0f}' for x, y in p)
bars = ''.join(f'<rect x="{l}" y="{t}" width="{r - l}" height="{b - t}" rx="{28 if i < 2 else 0}" fill="{hexc(CREAM)}"/>'
               for i, (l, t, r, b) in enumerate(BARS))
flames = ''.join(f'<polygon points="{pts(p)}" fill="{hexc(c)}"/>' for p, c in FLAMES)
open(svg, 'w').write(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 40 944 944">'
    f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{hexc(TOP)}"/>'
    f'<stop offset="1" stop-color="{hexc(BOT)}"/></linearGradient></defs>'
    '<rect x="40" y="40" width="944" height="944" rx="220" fill="url(#g)"/>' + bars + flames + '</svg>\n')
