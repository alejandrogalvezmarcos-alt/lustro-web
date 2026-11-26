"""Genera las imágenes ambientales de la web (luz sobre yeso, arcos, agua, lino).
Son composiciones propias, sin derechos de terceros. Sustituibles por fotos reales de la clínica
poniendo el mismo nombre de archivo en assets/img/."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img")

def rgb(h):
    return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], np.float32)

def vgrad(w, h, a, b, angle=0.35):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    t = np.clip((y / h) * (1 - angle) + (x / w) * angle, 0, 1)[..., None]
    return rgb(a) * (1 - t) + rgb(b) * t

def noise(w, h, scale, rng):
    sw, sh = max(2, w // scale), max(2, h // scale)
    n = Image.fromarray((rng.random((sh, sw)) * 255).astype(np.uint8))
    return np.asarray(n.resize((w, h), Image.BICUBIC), np.float32) / 255.0 - 0.5

def plaster(img, rng, amt=1.0):
    h, w = img.shape[:2]
    for s, a in ((220, 14), (60, 8), (14, 4), (2, 5)):
        img += noise(w, h, s, rng)[..., None] * a * amt
    return img

def mask(w, h, draw, blur):
    m = Image.new("L", (w, h), 0)
    draw(ImageDraw.Draw(m))
    if blur:
        m = m.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(m, np.float32)[..., None] / 255.0

def paint(img, m, color, alpha=1.0):
    return img * (1 - m * alpha) + rgb(color) * (m * alpha)

def arch(d, x, y, aw, ah, fill=255):
    d.pieslice([x, y, x + aw, y + aw], 180, 360, fill=fill)
    d.rectangle([x, y + aw / 2, x + aw, y + ah], fill=fill)

def window_light(img, w, h, x, y, lw, lh, skew, color="FFF3DC", alpha=.55, blur=14, bars=3):
    def dr(d):
        step = lw / bars
        for i in range(bars):
            x0 = x + i * step
            d.polygon([(x0, y), (x0 + step * .82, y), (x0 + step * .82 + skew, y + lh), (x0 + skew, y + lh)], fill=255)
        d.line([(x + skew * .45 - 40, y + lh * .45), (x + lw + skew * .45 + 40, y + lh * .45)], fill=0, width=int(lh * .03) + 3)
    return paint(img, mask(w, h, dr, blur), color, alpha)

def leaves(img, w, h, ox, oy, spread, n, rng, color="5C4C3A", alpha=.30, blur=9, size=1.0):
    def dr(d):
        for b in range(5):
            px, py = ox, oy
            ang = rng.uniform(.25, 1.35)
            for i in range(n):
                step = spread / n
                ang += rng.uniform(-.12, .12)
                nx, ny = px + np.cos(ang) * step, py + np.sin(ang) * step
                d.line([(px, py), (nx, ny)], fill=200, width=max(2, int(5 * size * (1 - i / n)) + 1))
                for side in (-1, 1):
                    la = ang + side * rng.uniform(.5, 1.1)
                    ln = rng.uniform(34, 78) * size
                    wd = ln * rng.uniform(.14, .24)
                    cx, cy = nx + np.cos(la) * ln / 2, ny + np.sin(la) * ln / 2
                    pts = []
                    for t in np.linspace(0, 2 * np.pi, 22):
                        u, v = np.cos(t) * ln / 2, np.sin(t) * wd / 2
                        pts.append((cx + u * np.cos(la) - v * np.sin(la), cy + u * np.sin(la) + v * np.cos(la)))
                    d.polygon(pts, fill=int(rng.uniform(170, 255)))
                px, py = nx, ny
    return paint(img, mask(w, h, dr, blur), color, alpha)

def save(img, name, rng, q=82):
    h, w = img.shape[:2]
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    v = 1 - 0.20 * np.clip((((x / w - .5) ** 2 + (y / h - .5) ** 2) * 2.2) - .1, 0, 1)
    img = img * v[..., None] + noise(w, h, 1, rng)[..., None] * 7
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name), quality=q, optimize=True, progressive=True)
    print(name, os.path.getsize(os.path.join(OUT, name)) // 1024, "KB")

# ---------- escenas ----------
def scene_arch(name, w, h, seed, wall, wall2, niche, niche2, light="FFF0D6", ax=.56, aw=.24, leaf=True, plinth=True):
    rng = np.random.default_rng(seed)
    img = plaster(vgrad(w, h, wall, wall2), rng)
    X, W, Y = w * ax, w * aw, h * .16
    floor = h * .84
    sh = mask(w, h, lambda d: arch(d, X - W * .06, Y + h * .005, W, floor - Y), w * .016)
    img = paint(img, sh, "3A2A1E", .30)
    am = mask(w, h, lambda d: arch(d, X, Y, W, floor - Y), 1.2)
    inner = plaster(vgrad(w, h, niche, niche2, .6), rng, .8)
    img = img * (1 - am) + inner * am
    depth = mask(w, h, lambda d: arch(d, X + W * .16, Y + W * .05, W, floor - Y), w * .02)
    img = paint(img, am * (1 - depth), "2B1D13", .38)
    fl = mask(w, h, lambda d: d.rectangle([0, floor, w, h], fill=255), 2)
    img = img * (1 - fl) + plaster(vgrad(w, h, wall2, niche2, .2), rng, .6) * fl
    img = paint(img, mask(w, h, lambda d: d.rectangle([0, floor - 3, w, floor + 12], fill=255), 8), "3A2A1E", .22)
    if plinth:
        px, pw, ph = X + W * .22, W * .56, h * .13
        img = paint(img, mask(w, h, lambda d: d.ellipse([px - pw * .5, floor - 14, px + pw * 1.05, floor + 30], fill=255), 14), "2E2016", .35)
        pm = mask(w, h, lambda d: d.rectangle([px, floor - ph, px + pw, floor], fill=255), 1)
        gx = np.linspace(0, 1, w)[None, :, None]
        body = rgb("E9DCC9") - np.clip((gx * w - px) / pw, 0, 1) * 52
        img = img * (1 - pm) + plaster(np.repeat(body, h, 0).astype(np.float32), rng, .5) * pm
        r = pw * .24
        cx, cy = px + pw * .5, floor - ph - r * .96
        sm = mask(w, h, lambda d: d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255), 1.5)
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        dist = np.sqrt((xx - (cx - r * .45)) ** 2 + (yy - (cy - r * .5)) ** 2) / (r * 1.9)
        ball = rgb("F2E5D2") * (1 - np.clip(dist, 0, 1)[..., None]) + rgb("8E6F58") * np.clip(dist, 0, 1)[..., None]
        img = img * (1 - sm) + ball * sm
    img = window_light(img, w, h, w * .06, h * .02, w * .34, h * .95, w * .17, light, .34, w * .008)
    if leaf:
        img = leaves(img, w, h, -w * .03, -h * .05, h * .85, 9, rng, "4E3F2F", .30, w * .0045, w / 1500)
        img = leaves(img, w, h, w * .9, -h * .1, h * .55, 7, rng, "4E3F2F", .16, w * .009, w / 1500)
    save(img, name, rng)

def scene_water(name, w, h, seed, a, b, hi="F4F1E6"):
    rng = np.random.default_rng(seed)
    img = vgrad(w, h, a, b, .15)
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    persp = 0.35 + 1.4 * (y / h)
    warp = noise(w, h, 190, rng) * 70 + noise(w, h, 70, rng) * 20
    ph = (y + warp) / (11 * persp) + np.sin(x / (170 * persp) + warp / 40) * 1.7
    wave = np.sin(ph)
    glint = np.clip(wave, 0, 1) ** 7 * np.clip(noise(w, h, 130, rng) * 2.2 + .55, 0, 1)
    img += (wave * 9)[..., None]
    img = paint(img, glint[..., None], hi, .75)
    sun = np.exp(-(((x - w * .68) / (w * .2)) ** 2 + ((y - h * .2) / (h * .35)) ** 2))[..., None]
    img = paint(img, sun, "FFF1D8", .45)
    save(img, name, rng)

def scene_linen(name, w, h, seed, a, b, fold="5E4634"):
    rng = np.random.default_rng(seed)
    img = vgrad(w, h, a, b, .5)
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    warp = noise(w, h, 260, rng) * 260 + noise(w, h, 110, rng) * 60
    u = (x * .75 + y * .55 + warp) / (w * .075)
    s = np.sin(u) * .6 + np.sin(u * .47 + 2) * .4
    img = paint(img, (np.clip(-s, 0, 1) ** 1.5)[..., None], fold, .36)
    img = paint(img, (np.clip(s, 0, 1) ** 2.2)[..., None], "FFF6E8", .50)
    img += (noise(w, h, 3, rng) * 9 + np.sin(x * 1.9) * 1.6 + np.sin(y * 1.9) * 1.6)[..., None]
    save(img, name, rng)

def scene_dunes(name, w, h, seed, sky, sky2, cols, sun="FFF2DA"):
    rng = np.random.default_rng(seed)
    img = vgrad(w, h, sky, sky2, .1)
    img = paint(img, mask(w, h, lambda d: d.ellipse([w * .62, h * .12, w * .62 + h * .26, h * .38], fill=255), 3), sun, .9)
    for i, c in enumerate(cols):
        base = h * (.46 + i * .15)
        ph = rng.uniform(0, 6)
        pts = [(x, base + np.sin(x / w * (3.2 - i * .5) + ph) * h * .075 + np.sin(x / w * 7 + ph * 2) * h * .012) for x in range(0, w + 8, 8)]
        m = mask(w, h, lambda d: d.polygon(pts + [(w, h), (0, h)], fill=255), 1.4)
        layer = plaster(vgrad(w, h, c, cols[min(i + 1, len(cols) - 1)], .45), rng, .6)
        img = paint(img, mask(w, h, lambda d: d.polygon([(px, py - 22) for px, py in pts] + [(w, h), (0, h)], fill=255), 26), "4A3526", .16)
        img = img * (1 - m) + layer * m
    save(img, name, rng)

def scene_orbit(name, w, h, seed, a, b, ring="FFF4E2"):
    rng = np.random.default_rng(seed)
    img = plaster(vgrad(w, h, a, b, .4), rng, .8)
    cx, cy = w * .54, h * .52
    for i, r in enumerate((.43, .33, .23, .13)):
        R = h * r
        img = paint(img, mask(w, h, lambda d: d.ellipse([cx - R + 24, cy - R + 36, cx + R + 24, cy + R + 36], fill=255), 30), "3B2A1D", .14)
        m = mask(w, h, lambda d: d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=255), 1.2)
        layer = plaster(vgrad(w, h, ring, a, .7), rng, .5)
        img = img * (1 - m * (.30 + i * .17)) + layer * (m * (.30 + i * .17))
    img = window_light(img, w, h, w * .05, -h * .05, w * .36, h * 1.1, w * .2, "FFF4DE", .24, w * .012, 2)
    save(img, name, rng)

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    scene_arch("hero.jpg", 2000, 1150, 4, "D9C6AC", "BFA588", "C7A789", "E6D3BB", ax=.62, aw=.22)
    scene_water("metodo.jpg", 1600, 1100, 11, "A9AE9C", "4F6159")
    scene_linen("longevidad.jpg", 1600, 1100, 7, "E7DAC6", "CDB59A")
    scene_dunes("visita.jpg", 1600, 1000, 9, "E9DCC8", "D8C0A4", ["CBA98A", "B58D70", "92705A", "6E5646"])
    # tarjetas de las ocho áreas (formato vertical)
    scene_water("a-salud-oral.jpg", 900, 1100, 21, "C3CEC6", "6F8A82")
    scene_arch("a-odontologia.jpg", 900, 1100, 22, "E5DACA", "CDBEA9", "B9AA95", "E9E0D2", ax=.30, aw=.52, leaf=False)
    scene_linen("a-estetica.jpg", 900, 1100, 23, "EBD5C8", "CFA894", "7A4A3A")
    scene_orbit("a-longevidad.jpg", 900, 1100, 24, "A8A58C", "6C6E58")
    scene_orbit("a-hormonal.jpg", 900, 1100, 25, "D7B592", "A9785A")
    scene_dunes("a-cardiologia.jpg", 900, 1100, 26, "E8D3C4", "D3AB97", ["C08C78", "A36E5E", "7F5148", "5C3B37"])
    scene_dunes("a-nutricion.jpg", 900, 1100, 27, "E6E1CB", "CFCBA8", ["B3B08A", "8F9270", "6E7558", "525A43"])
    scene_water("a-fisioterapia.jpg", 900, 1100, 28, "D2C3AC", "8A775F")
    scene_arch("clinica.jpg", 1600, 1100, 31, "CFC2AE", "AE9F89", "8F8674", "CBC1AC", ax=.16, aw=.3)
    scene_linen("cuaderno.jpg", 1600, 900, 41, "D9D3C3", "AEB0A0", "3F4A44")
