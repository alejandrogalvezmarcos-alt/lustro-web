# -*- coding: utf-8 -*-
"""Ilustración vectorial de la fachada (López de Hoyos 69), redibujada a partir de la
foto real de la clínica: misma estructura y rótulos, sin elementos ajenos.
Genera assets/img/fachada.svg; build.py la incrusta para que use las tipografías de la web."""
import os
import random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "img", "fachada.svg")
rnd = random.Random(69)
o = []
a = o.append


def rect(x, y, w, h, fill, extra=""):
    a('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" %s/>' % (x, y, w, h, fill, extra))


def poly(points, fill, extra=""):
    a('<polygon points="%s" fill="%s" %s/>' % (" ".join("%s,%s" % p for p in points), fill, extra))


def text(x, y, s, size, fill="#F6F1E8", family="Jost", extra=""):
    fam = "'Cormorant Garamond',Georgia,serif" if family == "serif" else "Jost,system-ui,sans-serif"
    a('<text x="%s" y="%s" font-family="%s" font-size="%s" fill="%s" %s>%s</text>' % (x, y, fam, size, fill, extra, s))


a('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 960" class="fx" role="img" aria-labelledby="fx-t">')
a('<title id="fx-t">Ilustración de la fachada de Clínica Lustro en la calle López de Hoyos 69, Madrid</title>')
a("""<defs>
<linearGradient id="fx-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2F3A"/><stop offset=".45" stop-color="#7A4C40"/><stop offset="1" stop-color="#9A6A54"/></linearGradient>
<linearGradient id="fx-stoneL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6F6663"/><stop offset="1" stop-color="#A3948A"/></linearGradient>
<linearGradient id="fx-stoneR" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E4F4C"/><stop offset="1" stop-color="#A97F74"/></linearGradient>
<linearGradient id="fx-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0CF"/><stop offset=".6" stop-color="#F2CC94"/><stop offset="1" stop-color="#C58E60"/></linearGradient>
<linearGradient id="fx-soffit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17120F"/><stop offset="1" stop-color="#3A2D25"/></linearGradient>
<linearGradient id="fx-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E6E5A"/><stop offset="1" stop-color="#2B221F"/></linearGradient>
<linearGradient id="fx-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F2926"/><stop offset="1" stop-color="#211C1A"/></linearGradient>
<linearGradient id="fx-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFDFA6" stop-opacity=".42"/><stop offset="1" stop-color="#FFDFA6" stop-opacity="0"/></linearGradient>
<radialGradient id="fx-glow"><stop offset="0" stop-color="#FFE6B0" stop-opacity=".95"/><stop offset=".35" stop-color="#FFC878" stop-opacity=".42"/><stop offset="1" stop-color="#FFB45C" stop-opacity="0"/></radialGradient>
<linearGradient id="fx-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2CC94" stop-opacity=".5"/><stop offset="1" stop-color="#F2CC94" stop-opacity="0"/></linearGradient>
<linearGradient id="fx-shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="fx-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="4"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".16"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="fx-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
</defs>""")

# muro superior de ladrillo y ventanas
rect(0, 0, 1500, 880, "url(#fx-wall)")
for row in range(0, 24):
    y = row * 13
    a('<path d="M0 %d H1500" stroke="#E8C3A8" stroke-opacity=".10" stroke-width="1.4"/>' % y)
    for x in range((row % 2) * 24, 1500, 48):
        a('<path d="M%d %d v13" stroke="#E8C3A8" stroke-opacity=".08" stroke-width="1.2"/>' % (x, y))
for x, w in ((-10, 150), (800, 250), (1290, 160)):
    rect(x, 0, w, 40, "#E9E0D2", 'opacity=".85"')
    rect(x + 8, 0, w - 16, 32, "url(#fx-glass)", 'class="lit"')
    for k in range(1, 3):
        rect(x + 8 + k * (w - 16) / 3.0, 0, 5, 32, "#B9AC9C")

# piedra a los lados
rect(0, 238, 262, 642, "url(#fx-stoneL)")
rect(1218, 238, 282, 642, "url(#fx-stoneR)")
for x0, x1 in ((0, 262), (1218, 1500)):
    for _ in range(520):
        a('<circle cx="%d" cy="%d" r="%.1f" fill="%s" opacity="%.2f"/>' % (
            rnd.randint(x0, x1), rnd.randint(240, 878), rnd.uniform(.8, 2.4), rnd.choice(["#F3E3D4", "#2C2220"]), rnd.uniform(.12, .38)))
for y in (520, 700):
    a('<path d="M0 %d H262 M1218 %d H1500" stroke="#2A201D" stroke-opacity=".28" stroke-width="2"/>' % (y, y))
# portal de la izquierda
rect(0, 345, 118, 535, "#241C19")
rect(0, 345, 118, 535, "url(#fx-fade)", 'class="lit" opacity=".8"')
for x in range(10, 112, 17):
    rect(x, 668, 4, 212, "#120E0D")
rect(0, 668, 118, 6, "#120E0D")

# acera
rect(0, 880, 1500, 80, "url(#fx-floor)")
for x in range(-200, 1700, 150):
    a('<path d="M%d 880 L%d 960" stroke="#1C1513" stroke-opacity=".45" stroke-width="2"/>' % (x, (x - 750) * 1.28 + 750))
a('<ellipse cx="740" cy="900" rx="560" ry="46" fill="url(#fx-glow)" class="lit night" opacity=".75"/>')

# velo de atardecer: solo sobre muro y piedra, para que la luz destaque
rect(0, 0, 1500, 960, "#161A38", 'class="dusk" style="mix-blend-mode:multiply;pointer-events:none"')

# escaparate
rect(258, 380, 962, 504, "#1E1917", 'rx="6"')
panes = [(288, 408, 154, 432), (736, 412, 204, 456), (956, 412, 232, 456), (462, 516, 100, 344), (576, 516, 136, 344)]
for i, (x, y, w, h) in enumerate(panes):
    rx = 22 if i < 3 else 3
    rect(x, y, w, h, "#31261F", 'rx="%d"' % rx)
    rect(x, y, w, h, "url(#fx-glass)", 'rx="%d" class="lit"' % rx)
# interior insinuado
a('<g class="lit" opacity=".5">')
for cx in (330, 400, 838, 1070):
    a('<ellipse cx="%d" cy="436" rx="17" ry="6" fill="#FFFBEF"/><ellipse cx="%d" cy="440" rx="44" ry="26" fill="url(#fx-glow)"/>' % (cx, cx))
a('<path d="M1005 826 q60 -26 130 0 l-6 10 q-58 -18 -118 0 Z" fill="#8B5F42"/><rect x="1064" y="832" width="9" height="30" fill="#8B5F42"/>')
a('<rect x="300" y="764" width="62" height="74" rx="4" fill="#A9754F"/></g>')
# vinilo esmerilado
for x, y, w, h in ((288, 556, 154, 200), (736, 540, 204, 250), (956, 540, 232, 250), (462, 590, 100, 110), (576, 590, 136, 110)):
    rect(x, y, w, h, "#FFF9EE", 'opacity=".46"')
rect(288, 572, 154, 10, "#FFF9EE", 'opacity=".5"'); rect(288, 728, 154, 10, "#FFF9EE", 'opacity=".5"')
INK = "#33271F"
text(365, 640, "clínica de salud", 15, INK, extra='text-anchor="middle"')
text(365, 660, "oral y longevidad", 15, INK, extra='text-anchor="middle"')
for i, s in enumerate(["SALUD ORAL", "ODONTOLOGÍA", "MEDICINA ESTÉTICA", "Y CIRUGÍA", "FISIOTERAPIA"]):
    text(838, 594 + i * 23, s, 14, INK, extra='text-anchor="middle" letter-spacing="1.2"')
for i, s in enumerate(["LONGEVIDAD", "SALUD HORMONAL", "CARDIOLOGÍA PREVENTIVA", "NUTRICIÓN"]):
    text(974, 612 + i * 23, s, 14, INK, extra='letter-spacing="1.2"')
text(924, 740, "613 767 627", 13, INK, extra='text-anchor="end"')
text(924, 758, "clinicalustro.com", 13, INK, extra='text-anchor="end"')


def bars(x, y, h, unit, fill):
    cx = x
    for w in (1.0, 1.5, 2.1, 2.8, 3.6):
        rect(round(cx, 1), y, round(w * unit, 1), h, fill)
        cx += w * unit + unit * 1.5


bars(600, 623, 15, 1.1, INK)
text(625, 637, "LUSTRO", 17, INK, "serif", 'letter-spacing=".8" font-weight="600"')
rect(586, 592, 8, 104, "#1A1513", 'rx="4"'); rect(576, 600, 14, 6, "#1A1513"); rect(576, 682, 14, 6, "#1A1513")
# reflejos
for x, y, w, h in panes:
    poly([(x + w * .08, y), (x + w * .34, y), (x + w * .12, y + h), (x - 0 + w * .0, y + h)], "url(#fx-shine)", 'opacity=".55"')
rect(452, 506, 270, 8, "#1E1917")

# faldón de lamas sobre la puerta
for i in range(5):
    x = 444 + i * 58
    rect(x, 384, 54, 108, "url(#fx-panel)")
    rect(x, 384, 3, 108, "#51443B")

# marquesina: plafón inferior
poly([(0, 234), (1496, 232), (1236, 392), (256, 392)], "url(#fx-soffit)")
for i in range(1, 52):
    t = i / 52.0
    a('<path d="M%.0f 234 L%.0f 392" stroke="#7B6455" stroke-opacity=".26" stroke-width="1.6"/>' % (t * 1496, 256 + t * 980))
a('<path d="M256 392 H1236" stroke="#6A5548" stroke-width="3"/>')
# nervios centrales: eco de las cinco barras
for i in range(5):
    xt, xb = 204 + i * 102, 444 + i * 58
    poly([(xt, 190), (xt + 94, 190), (xb + 52, 386), (xb, 386)], "url(#fx-panel)", 'stroke="#55463C" stroke-width="2"')
# focos
lights = [(138, 288), (310, 340), (850, 342), (1030, 286), (1122, 342), (1330, 288)]
a('<g class="lit night">')
for x, y in lights:
    poly([(x - 16, y + 4), (x + 16, y + 4), (x + 150, 880), (x - 150, 880)], "url(#fx-cone)", 'opacity=".3"')
for x, y in lights:
    a('<circle cx="%d" cy="%d" r="62" fill="url(#fx-glow)"/><ellipse cx="%d" cy="%d" rx="19" ry="8" fill="#FFF6DE"/>' % (x, y, x, y))
a("</g>")
for x, y in lights:
    a('<ellipse cx="%d" cy="%d" rx="22" ry="10" fill="none" stroke="#8A7263" stroke-width="2"/>' % (x, y))

# frente de la marquesina y rótulos
rect(0, 92, 206, 144, "url(#fx-panel)", 'stroke="#5B4B41" stroke-width="3"')
rect(718, 66, 778, 168, "url(#fx-panel)", 'stroke="#5B4B41" stroke-width="3"')
rect(180, 6, 534, 184, "url(#fx-panel)", 'stroke="#6A574B" stroke-width="4"')
rect(180, 190, 534, 7, "#0F0B0A", 'opacity=".7"')
bars(76, 136, 54, 5.2, "#FBF6EC")
a('<g class="sign">')
text(448, 130, "LUSTRO", 112, "#FFE2B4", "serif", 'text-anchor="middle" letter-spacing="9" font-weight="600" filter="url(#fx-blur)" class="lit" textLength="470" lengthAdjust="spacingAndGlyphs"')
text(448, 134, "LUSTRO", 112, "#120D0B", "serif", 'text-anchor="middle" letter-spacing="9" font-weight="600" opacity=".7" textLength="470" lengthAdjust="spacingAndGlyphs"')
text(445, 130, "LUSTRO", 112, "#FFFBF3", "serif", 'text-anchor="middle" letter-spacing="9" font-weight="600" textLength="470" lengthAdjust="spacingAndGlyphs"')
a("</g>")
text(1106, 160, "clínica de salud oral y longevidad", 28, "#FBF6EC", extra='text-anchor="middle" letter-spacing="3.4" textLength="560" lengthAdjust="spacing"')

# grano
rect(0, 0, 1500, 960, "#fff", 'filter="url(#fx-grain)" style="mix-blend-mode:overlay;pointer-events:none"')
a("</svg>")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(o))
print("fachada.svg", os.path.getsize(OUT) // 1024, "KB")
