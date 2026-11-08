"""Cut a large square map image into a zoom-level tile pyramid (tiles/{z}/{x}/{y}.webp).

Usage: python scripts/make_tiles.py night-city-map.png [--tile 512] [--max-zoom 5]

Level `max-zoom` is the full-resolution image; each lower level is half the size of the one above.
Edge tiles are not padded: the viewer derives their real size from the source size in tiles/meta.json.
Requires Pillow (build-time only; the app itself needs nothing).
"""
import argparse, json, math, shutil
from pathlib import Path
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[1]

parser = argparse.ArgumentParser()
parser.add_argument('source')
parser.add_argument('--tile', type=int, default=512)
parser.add_argument('--max-zoom', type=int, default=5)
parser.add_argument('--out', default=str(ROOT / 'tiles'))
args = parser.parse_args()

out = Path(args.out)
if out.exists():
    shutil.rmtree(out)
current = Image.open(args.source).convert('RGB')
width, height = current.size
count = 0
for z in range(args.max_zoom, -1, -1):
    if z != args.max_zoom:
        current = current.resize((max(1, math.ceil(current.width / 2)), max(1, math.ceil(current.height / 2))), Image.LANCZOS)
    for x in range(math.ceil(current.width / args.tile)):
        for y in range(math.ceil(current.height / args.tile)):
            box = (x * args.tile, y * args.tile, min(current.width, (x + 1) * args.tile), min(current.height, (y + 1) * args.tile))
            path = out / str(z) / str(x) / f'{y}.webp'
            path.parent.mkdir(parents=True, exist_ok=True)
            current.crop(box).save(path, 'WEBP', lossless=True, quality=90, method=4)
            count += 1
    print(f'zoom {z}: {current.width}x{current.height}', flush=True)

(out / 'meta.json').write_text(json.dumps({'width': width, 'height': height, 'tile': args.tile, 'maxZoom': args.max_zoom}), encoding='utf-8')
size = sum(p.stat().st_size for p in out.rglob('*') if p.is_file())
print(f'{count} tiles, {size / 1e6:.1f} MB')
