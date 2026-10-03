"""Deterministic derivation of helper layers from the supplied pack (no redraw).
1. Mouth openings: keep only the dark opening/tongue pixels of each supplied
   mouth sprite (removes the flat skin patch + grey halo so the overlay does not
   cover the painted face).
2. Family vignette: elliptical-feathered crop of the thought cloud in
   scene_references/05_family_vignette_reference.png.
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, json, sys
P = 'public/'
for n in ['fatima', 'ghozlan', 'dr_heba']:
    for s in range(4):
        a = np.array(Image.open(P + f'characters/mouth_shapes/{n}_mouth_{s}.png').convert('RGBA')).astype(float)
        skin = a[30, 48, :3] if s == 0 else np.array(Image.open(P + f'characters/mouth_shapes/{n}_mouth_0.png').convert('RGBA'))[12, 48, :3].astype(float)
        dist = np.sqrt(((a[..., :3] - skin) ** 2).sum(-1))
        lum = a[..., :3].mean(-1)
        keep = (dist > 70) & (a[..., 3] > 200)
        h, w = keep.shape
        yy, xx = np.mgrid[0:h, 0:w]
        keep &= ((xx - w / 2) / (w * 0.32)) ** 2 + ((yy - h / 2) / (h * 0.36)) ** 2 < 1
        alpha = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
        out = Image.fromarray(a.astype(np.uint8)); out.putalpha(alpha)
        out.save(P + f'derived/mouths/{n}_open_{s}.png')
# family vignette crop
ref = Image.open(P + 'scene_references/05_family_vignette_reference.png').convert('RGBA')
box = tuple(int(v) for v in sys.argv[1:5]) if len(sys.argv) > 4 else (262, 92, 772, 466)
crop = ref.crop(box)
w, h = crop.size
m = Image.new('L', (w, h), 0)
ImageDraw.Draw(m).ellipse((w * 0.06, h * 0.06, w * 0.94, h * 0.94), fill=255)
m = m.filter(ImageFilter.GaussianBlur(min(w, h) * 0.04))
crop.putalpha(m)
crop.save(P + 'derived/family_vignette.png')
print('ok', box, crop.size)
# 3. Character cutouts: drop disconnected alpha fragments (slivers of neighbouring
#    characters left in the supplied crops). Pixels of the main body are untouched.
from scipy import ndimage
for n in ['fatima', 'ghozlan', 'dr_heba']:
    im = Image.open(P + f'characters/clean/{n}.png').convert('RGBA')
    a = np.array(im)
    lab, k = ndimage.label(a[..., 3] > 8)
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
    main = lab == (1 + int(np.argmax(sizes)))
    main = ndimage.binary_dilation(main, iterations=2)
    removed = int(((a[..., 3] > 8) & ~main).sum())
    a[..., 3] = np.where(main, a[..., 3], 0)
    Image.fromarray(a).save(P + f'derived/characters/{n}.png')
    print(n, 'components', k, 'removed px', removed)
# 3b. Fatima's crop carries a strip of Ghozlan's blue sleeve on its right edge
#     (x > 280, upper body). Remove only clearly-blue pixels there.
a = np.array(Image.open(P + 'derived/characters/fatima.png'))
r, g, b = [a[..., i].astype(int) for i in range(3)]
blue = (b > r + 25) & (b > g)
zone = np.zeros_like(blue); zone[:600, 270:] = True
a[..., 3] = np.where(blue & zone, 0, a[..., 3])
Image.fromarray(a).save(P + 'derived/characters/fatima.png')
print('fatima blue px removed', int((blue & zone).sum()))
