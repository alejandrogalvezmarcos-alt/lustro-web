# -*- coding: utf-8 -*-
"""Genera las páginas HTML a partir de content.py.  Uso:  python3 tools/build.py"""
import json
import os
from html import escape as e

from content import CLINIC as C, HOURS, TEAM, AREAS, PILLARS, STEPS, VISIT, ARTICLES, FAQS

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
# False mientras sea un borrador sin validar por la clínica: pide a los buscadores que no lo indexen.
INDEXABLE = False
BASE_URL = "https://alejandrogalvezmarcos-alt.github.io/lustro-web/"

IG_ICON = ('<svg viewBox="0 0 24 24" class="ig" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">'
           '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none"/></svg>')


def facade():
    with open(os.path.join(ROOT, "assets", "img", "fachada.svg"), encoding="utf-8") as f:
        svg = f.read()
    return ('<figure class="facade reveal">%s<figcaption><span>López de Hoyos 69 · ilustración a partir de la fachada</span>'
            '<button type="button" class="link" data-facade aria-pressed="false">Ver de día</button></figcaption></figure>') % svg


LOGO = ('<svg viewBox="0 0 34 24" aria-hidden="true" class="mark"><g fill="currentColor">'
        '<rect x="0" y="0" width="1.4" height="24"/><rect x="5" y="0" width="2.2" height="24"/>'
        '<rect x="11" y="0" width="3.2" height="24"/><rect x="18.5" y="0" width="4.4" height="24"/>'
        '<rect x="27.5" y="0" width="6" height="24"/></g></svg>')

NAV = [("metodo.html", "El Método Lustro"), ("especialidades.html", "Especialidades"),
       ("calcula.html", "Calcula tu salud"), ("equipo.html", "Equipo"),
       ("primera-visita.html", "Tu primera visita"), ("cuaderno.html", "Cuaderno de salud"),
       ("preguntas.html", "Preguntas frecuentes")]


def page(path, title, desc, body, scripts=(), app=False, active="", extra_head=""):
    # la página 404 se sirve desde cualquier ruta: necesita direcciones absolutas
    r = "/lustro-web/" if path == "404.html" else "../" * path.count("/")
    links = "".join('<a href="%s%s"%s>%s</a>' % (r, h, ' aria-current="page"' if h == active else "", t) for h, t in NAV)
    hours = "".join("<li><span>%s</span><span>%s</span></li>" % h for h in HOURS)
    areas = "".join('<li><a href="%sespecialidades/%s.html">%s</a></li>' % (r, a["slug"], a["name"]) for a in AREAS)
    base = ["config.js", "areas.js", "consent.js", "site.js"]
    js = "".join('<script src="%sassets/js/%s"></script>\n' % (r, s) for s in base + list(scripts))
    css = '<link rel="stylesheet" href="%sassets/css/site.css">' % r
    if not INDEXABLE and not app:
        extra_head += '\n<meta name="robots" content="noindex">'
    if app:
        css += '\n<link rel="stylesheet" href="%sassets/css/app.css">' % r
        extra_head += '\n<meta name="robots" content="noindex, nofollow">'
    html = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#F3EFE8">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="Clínica Lustro">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{base}og.jpg">
<link rel="icon" href="{r}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="{r}fonts/Cormorant.woff2" as="font" type="font/woff2" crossorigin>
{css}{extra}
</head>
<body{bodyclass} data-root="{r}">
<a class="skip" href="#main">Saltar al contenido</a>
<header class="top">
  <div class="top-l"><button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu"><i></i><span>Menú</span></button></div>
  <a class="brand" href="{r}index.html" aria-label="Clínica Lustro, inicio">{logo}<span>LUSTRO</span></a>
  <div class="top-r"><a class="top-ig" href="{ig}" rel="noopener" target="_blank" aria-label="Instagram @clinicalustro">{igicon}</a><a class="top-link" href="{r}acceso.html">Mi área</a><a class="btn dark" href="{r}reservar.html">Reservar</a></div>
</header>
<div class="menu" id="menu" hidden>
  <div class="menu-bar"><button class="menu-close" type="button">Cerrar</button></div>
  <div class="menu-grid">
    <nav aria-label="Principal">{links}</nav>
    <div class="menu-side">
      <img src="{r}assets/img/clinica.jpg" alt="" width="1600" height="1100" loading="lazy">
      <p>{street}, {city}<br><a href="tel:{telh}">{tel}</a> · <a href="https://wa.me/{wa}" rel="noopener" target="_blank">WhatsApp</a></p>
      <p><a href="{r}reservar.html">Reservar cita</a> · <a href="{r}acceso.html">Acceso pacientes</a></p>
      <p><a class="ig-link" href="{ig}" rel="noopener" target="_blank">{igicon}<span>@clinicalustro</span></a></p>
    </div>
  </div>
</div>
<main id="main">
{body}
</main>
<footer class="foot">
  <div class="wrap foot-grid">
    <div><a class="brand" href="{r}index.html">{logo}<span>LUSTRO</span></a>
      <p>Salud oral, estética y longevidad.<br>Método Lustro, método integral de salud.</p>
      <p><a href="tel:{telh}">{tel}</a><br><a href="mailto:{email}">{email}</a><br><a class="ig-link" href="{ig}" rel="noopener" target="_blank">{igicon}<span>@clinicalustro</span></a></p>
      <p>{street}<br>{cp} {city}<br><a class="more" href="{maps}" rel="noopener" target="_blank">Cómo llegar</a></p></div>
    <div><h3>Horario</h3><ul class="hours">{hours}</ul></div>
    <div><h3>Especialidades</h3><ul>{areas}</ul></div>
    <div><h3>Tu cuidado</h3><ul>
      <li><a href="{r}metodo.html">Método Lustro</a></li><li><a href="{r}calcula.html">Calcula tu salud</a></li>
      <li><a href="{r}primera-visita.html">Tu primera visita</a></li><li><a href="{r}cuaderno.html">Cuaderno de salud</a></li>
      <li><a href="{r}preguntas.html">Preguntas frecuentes</a></li><li><a href="{r}reservar.html">Reservar cita</a></li>
      <li><a href="{r}acceso.html">Acceso pacientes</a></li></ul></div>
  </div>
  <div class="wrap foot-end">
    <span>Centro sanitario autorizado nº {cs} · {company}</span>
    <span><a href="{r}aviso-legal.html">Aviso legal</a> <a href="{r}privacidad.html">Privacidad</a> <a href="{r}cookies.html">Cookies</a> <button type="button" data-cookies>Configurar cookies</button></span>
  </div>
</footer>
{js}</body>
</html>
""".format(title=e(title), desc=e(desc), r=r, css=css, extra=extra_head, logo=LOGO, links=links, hours=hours,
           areas=areas, body=body.replace("{R}", r), js=js, bodyclass=' class="app"' if app else "",
           street=C["street"], city=C["city"], cp=C["cp"], tel=C["tel"], telh=C["tel_href"], wa=C["wa"],
           base=BASE_URL, email=C["email"], ig=C["instagram"], igicon=IG_ICON, maps=C["maps"], cs=C["cs"], company=C["company"])
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(html)


# ---------- bloques ----------
def img(name, alt="", cls="", w=1600, h=1100, eager=False):
    return '<img src="{R}assets/img/%s" alt="%s" class="%s" width="%d" height="%d"%s>' % (
        name, e(alt), cls, w, h, ' fetchpriority="high"' if eager else ' loading="lazy"')


def hero(image, eyebrow, title, text="", alt=""):
    return """<section class="hero-sm">
  <div class="frame">%s</div>
  <div class="wrap narrow center reveal"><p class="eyebrow">%s</p><h1>%s</h1>%s</div>
</section>""" % (img(image, alt, eager=True), eyebrow, title, '<p class="lead">%s</p>' % text if text else "")


def cta(title="Tu valoración empieza escuchándote", text="Cuéntanos qué te interesa y cuándo te viene bien. La clínica te confirma la hora.", area=""):
    q = "?area=" + area if area else ""
    return """<section class="cta"><div class="wrap narrow center reveal">
  <p class="eyebrow">Pide cita</p><h2>%s</h2><p class="lead">%s</p>
  <p class="actions"><a class="btn dark" href="{R}reservar.html%s">Reservar cita</a><a class="btn" href="tel:%s">Llamar al %s</a><a class="btn" href="https://wa.me/%s" rel="noopener" target="_blank">WhatsApp</a></p>
</div></section>""" % (title, text, q, C["tel_href"], C["tel"], C["wa"])


def acc(items):
    return '<div class="acc">%s</div>' % "".join(
        "<details><summary>%s</summary><div><p>%s</p></div></details>" % (e(q), e(a)) for q, a in items)


def card(a):
    return """<a class="card" href="{R}especialidades/%s.html">%s<p class="eyebrow">Especialidad</p><h3>%s</h3><p>%s</p><span class="more">Descubrir</span></a>""" % (
        a["slug"], img(a["img"], "", "", 900, 1100), a["name"], a["claim"])


def rail(title, text, cards):
    return """<section class="rail-sec"><div class="wrap rail-grid">
  <div class="rail-head reveal"><h2>%s</h2><p>%s</p>
    <div class="arrows"><button type="button" data-rail="-1" aria-label="Anterior">←</button><button type="button" data-rail="1" aria-label="Siguiente">→</button></div></div>
  <div class="rail" tabindex="0" aria-label="%s">%s</div>
</div></section>""" % (title, text, e(title), cards)


def photo_of(ident):
    """Foto del profesional, si existe en assets/img/equipo/<id>.(webp|jpg)."""
    for ext in ("webp", "jpg"):
        rel = "equipo/%s.%s" % (ident, ext)
        if os.path.exists(os.path.join(ROOT, "assets", "img", rel)):
            return rel
    return None


def team_block(people):
    """Con fotos de todos: fichas con retrato. Si falta alguna: directorio tipográfico."""
    if all(photo_of(t[0]) for t in people):
        return '<div class="team%s">%s</div>' % (" few" if len(people) < 4 else "", "".join(
            '<article class="member reveal"><span class="ph">%s</span><h3>%s</h3><p class="role">%s</p>%s</article>' % (
                img(photo_of(t[0]), t[1], "", 800, 1000), t[1], t[2], '<p class="col">N.º col. %s</p>' % t[3] if t[3] else "") for t in people))
    return '<ul class="people">%s</ul>' % "".join(
        '<li class="reveal"><h3>%s</h3><p>%s</p>%s</li>' % (t[1], t[2], '<small>N.º col. %s</small>' % t[3] if t[3] else "") for t in people)


def steps():
    return '<ol class="steps">%s</ol>' % "".join('<li class="reveal"><b>%s</b><h3>%s</h3><p>%s</p></li>' % s for s in STEPS)


# ---------- páginas ----------
def home():
    pillars = "".join("<details%s><summary><em>%s</em> %s</summary><div><p>%s</p></div></details>" % (" open" if i == 0 else "", n, t, d)
                      for i, (n, t, d) in enumerate(PILLARS))
    notes = "".join('<a class="note reveal" href="{R}cuaderno.html#%s"><p class="eyebrow">%s</p><h3>%s</h3><span class="more">Leer</span></a>' % (a[0], a[1], a[2]) for a in ARTICLES[:3])
    byslug = {a["slug"]: a for a in AREAS}
    body = """
<section class="hero">
  <div class="frame">{heroimg}
    <div class="hero-text"><p class="eyebrow">Centro sanitario autorizado · Madrid</p>
      <h1>Empezamos por tu boca,<br><em>pero no terminamos en ella.</em></h1>
      <p class="actions"><a class="btn dark" href="{{R}}reservar.html">Reservar cita</a><a class="btn light" href="{{R}}calcula.html">Calcula tu salud</a></p></div>
  </div>
  <div class="wrap under"><div><p class="eyebrow">Clínica Lustro · López de Hoyos 69</p><h2>Salud oral, estética y longevidad en un mismo lugar</h2></div><a class="more" href="{{R}}metodo.html">Descubre el método</a></div>
</section>

<section class="statement"><div class="wrap narrow center reveal">
  <p class="big">Un mismo equipo, una sola historia y un plan que te acompaña en el tiempo.</p>
  <p>Odontología, medicina estética y cirugía, cardiología preventiva, salud hormonal, nutrición, fisioterapia y longevidad. No para hacer más cosas, sino para que lo que hagas por tu salud tenga sentido en conjunto.</p>
</div></section>

<section><div class="wrap editorial">
  <a class="ed reveal" href="{{R}}especialidades/salud-oral.html">{e1}<p class="eyebrow">Salud oral</p><h3>La puerta de entrada</h3><p>{c1}</p><span class="more">Descubrir</span></a>
  <a class="ed small reveal" href="{{R}}especialidades/estetica.html">{e2}<p class="eyebrow">Medicina estética y cirugía</p><h3>Armonía, no transformación</h3><p>Primero la salud y tus expectativas. Después, solo lo que tenga sentido.</p><span class="more">Descubrir</span></a>
</div></section>

{rail}

<section class="split"><div class="wrap split-grid">
  <div class="split-img reveal">{metodo}</div>
  <div class="reveal"><p class="eyebrow">Método Lustro</p><h2>Cuatro ámbitos, una visión</h2>
    <p>La salud comienza por la boca, pero no termina en ella. Cuidamos a la vez cuatro ámbitos que se influyen entre sí.</p>
    <div class="acc">{pillars}</div><a class="more" href="{{R}}metodo.html">Conocer el método</a></div>
</div></section>

<section class="dark-sec"><div class="wrap">
  <div class="center narrow reveal"><p class="eyebrow">Cómo trabajamos</p><h2>Un camino en cuatro pasos</h2></div>{steps}
</div></section>

<section><div class="wrap teaser">
  <div class="reveal"><p class="eyebrow">Interactivo · 3 minutos</p><h2>Calcula tu salud</h2>
    <p>Cinco ámbitos, cinco barras: boca, corazón y metabolismo, alimentación, movimiento y descanso. Obtén una orientación personalizada y descubre por dónde empezar.</p>
    <ul class="ticks"><li>Índice de masa corporal y perímetro de cintura</li><li>Referencias de actividad física y sueño</li><li>Hábitos de higiene y señales de la boca</li><li>Tus respuestas no salen de tu navegador</li></ul>
    <a class="btn dark" href="{{R}}calcula.html">Empezar</a></div>
  <div class="bars-demo reveal" aria-hidden="true"><i style="--h:62%"><span>Boca</span></i><i style="--h:78%"><span>Corazón</span></i><i style="--h:54%"><span>Nutrición</span></i><i style="--h:40%"><span>Movimiento</span></i><i style="--h:70%"><span>Descanso</span></i></div>
</div></section>

<section class="split flip"><div class="wrap split-grid">
  <div class="split-img tall reveal">{dra}</div>
  <div class="reveal"><p class="eyebrow">Dirección médica</p><h2>Dra. Gabriel</h2>
    <blockquote>«Tu valoración empieza escuchándote.»</blockquote>
    <p>Un equipo de profesionales de distintas especialidades médicas y odontológicas que comparten una misma forma de atender: rigurosa, personalizada y cercana.</p>
    <a class="more" href="{{R}}equipo.html">Conocer al equipo</a></div>
</div></section>

<section><div class="wrap"><div class="sec-head reveal"><div><p class="eyebrow">Equipo</p><h2>Quién te cuida</h2></div><a class="more" href="{{R}}equipo.html">Conocer al equipo</a></div>
  {people}</div></section>

<section class="facade-sec"><div class="wrap">{facade}
  <div class="under"><div><p class="eyebrow">Ven a vernos</p><h2>C/ López de Hoyos 69, Madrid</h2></div><a class="more" href="{maps}" rel="noopener" target="_blank">Cómo llegar</a></div></div></section>

<section class="insta"><div class="wrap">
  <div class="center narrow reveal"><p class="eyebrow">Instagram</p><h2><a href="{ig}" rel="noopener" target="_blank">@clinicalustro</a></h2><p>El día a día de la clínica, el equipo y consejos para cuidarte.</p>
    <p class="actions"><a class="btn dark ig-btn" href="{ig}" rel="noopener" target="_blank">{igicon}Seguir en Instagram</a></p></div>
  <div class="tiles-ig reveal">{tiles}</div></div></section>

<section class="wide-img"><div class="frame">{visita}</div>
  <div class="wrap under"><div><p class="eyebrow">Tu primera visita</p><h2>Sin prisas y con todo explicado</h2></div><a class="more" href="{{R}}primera-visita.html">Qué esperar</a></div>
</section>

<section><div class="wrap"><div class="sec-head reveal"><h2>Cuaderno de salud</h2><a class="more" href="{{R}}cuaderno.html">Ver todo</a></div><div class="notes">{notes}</div></div></section>

<section><div class="wrap split-grid">
  <div class="reveal"><p class="eyebrow">Preguntas frecuentes</p><h2>Antes de venir</h2><a class="more" href="{{R}}preguntas.html">Todas las preguntas</a></div>
  <div class="reveal">{faq}</div>
</div></section>
""".format(heroimg=img("hero.jpg", "", "", 2000, 1150, True), e1=img("a-salud-oral.jpg", "", "", 900, 1100), c1=byslug["salud-oral"]["claim"],
           e2=img("a-estetica.jpg", "", "", 900, 1100),
           rail=rail("Ocho especialidades", "Puedes venir por una sola cosa. Lo demás está ahí cuando tenga sentido para ti.", "".join(card(a) for a in AREAS)),
           metodo=img("metodo.jpg"), pillars=pillars, steps=steps(), dra=img("dra-gabriel.jpg", "Dra. Gabriel, directora médica", "", 766, 976),
           visita=img("visita.jpg", "", "", 1600, 1000), notes=notes, faq=acc(FAQS[0][1]),
           facade=facade(), maps=C["maps"], ig=C["instagram"], igicon=IG_ICON,
           people=team_block(TEAM),
           tiles="".join('<a href="%s" rel="noopener" target="_blank" aria-label="Abrir Instagram de Clínica Lustro">%s<span>%s</span></a>' % (C["instagram"], img(n, "", "", 900, 1100), IG_ICON)
                         for n in ("a-salud-oral.jpg", "dra-gabriel.jpg", "a-nutricion.jpg", "a-estetica.jpg", "a-cardiologia.jpg", "a-odontologia.jpg")))
    ld = {"@context": "https://schema.org", "@type": ["MedicalClinic", "Dentist"], "name": "Clínica Lustro", "url": "https://clinicalustro.com",
          "telephone": C["tel_href"], "email": C["email"],
          "address": {"@type": "PostalAddress", "streetAddress": C["street"], "postalCode": C["cp"], "addressLocality": C["city"], "addressCountry": "ES"},
          "openingHours": ["Mo,We,Fr 10:00-19:30", "Tu,Th 10:00-14:00", "Tu,Th 16:00-20:00"], "sameAs": [C["instagram"]]}
    page("index.html", "Clínica Lustro · Salud oral, estética y longevidad en Madrid",
         "Método Lustro: odontología, medicina estética y cirugía, cardiología preventiva, salud hormonal, nutrición, fisioterapia y longevidad en López de Hoyos 69, Madrid.",
         body + cta(), extra_head='<script type="application/ld+json">%s</script>' % json.dumps(ld, ensure_ascii=False))


def metodo():
    blocks = ""
    links = [["salud-oral", "odontologia"], ["estetica"], ["cardiologia", "hormonal", "nutricion"], ["longevidad", "fisioterapia"]]
    pics = ["a-salud-oral.jpg", "a-estetica.jpg", "a-cardiologia.jpg", "a-longevidad.jpg"]
    byslug = {a["slug"]: a for a in AREAS}
    for i, (n, t, d) in enumerate(PILLARS):
        ls = " ".join('<a class="chip" href="{R}especialidades/%s.html">%s</a>' % (s, byslug[s]["name"]) for s in links[i])
        blocks += '<section class="split%s"><div class="wrap split-grid"><div class="split-img tall reveal">%s</div><div class="reveal"><p class="eyebrow">Ámbito %s</p><h2>%s</h2><p class="lead">%s</p><p>%s</p></div></div></section>' % (
            " flip" if i % 2 else "", img(pics[i], "", "", 900, 1100), n, t, d, ls)
    body = hero("metodo.jpg", "Método Lustro", "El método integral de salud", "Una visión completa del cuerpo. Cuidamos a la vez cuatro ámbitos, porque la salud comienza por la boca, pero no termina en ella.")
    body += """<section class="statement"><div class="wrap narrow center reveal"><p class="big">Cada especialista mira una parte. El método se encarga de que alguien mire el conjunto.</p>
<p>En lugar de consultas aisladas, trabajamos con una información ordenada, unas prioridades compartidas y un seguimiento. Así evitamos consejos contradictorios y esfuerzos que no llegan a ninguna parte.</p></div></section>"""
    body += blocks
    body += '<section class="dark-sec"><div class="wrap"><div class="center narrow reveal"><p class="eyebrow">El recorrido</p><h2>Diagnóstico, prevención, tratamiento y seguimiento</h2></div>%s</div></section>' % steps()
    body += '<section><div class="wrap split-grid"><div class="reveal"><p class="eyebrow">Compromisos</p><h2>Lo que puedes esperar</h2></div><div class="reveal">%s</div></div></section>' % acc([
        ("Explicaciones claras", "Qué hemos visto, qué significa y qué opciones hay, con palabras que se entienden."),
        ("Decides tú", "Proponemos y razonamos. Ningún tratamiento empieza sin tu consentimiento informado."),
        ("Presupuesto por escrito", "Antes de empezar, para que puedas valorarlo con calma."),
        ("Sin promesas imposibles", "La medicina tiene límites y te los contaremos."),
        ("Tus datos, protegidos", "La información de salud es especialmente sensible y se trata como tal.")])
    page("metodo.html", "Método Lustro · Clínica Lustro", "El método integral de salud de Clínica Lustro: salud oral, estética, salud sistémica y longevidad.",
         body + cta(), active="metodo.html")


def especialidades():
    body = hero("clinica.jpg", "Especialidades", "Ocho áreas, un solo plan", "Elige por dónde quieres empezar. Si no lo tienes claro, reserva una primera valoración y te orientamos.")
    body += '<section><div class="wrap grid-cards">%s</div></section>' % "".join('<div class="reveal">%s</div>' % card(a) for a in AREAS)
    page("especialidades.html", "Especialidades · Clínica Lustro", "Salud oral, odontología, medicina estética y cirugía, longevidad, salud hormonal, cardiología preventiva, nutrición y fisioterapia en Madrid.",
         body + cta(), active="especialidades.html")
    for i, a in enumerate(AREAS):
        team = [t for t in TEAM if a["slug"] in t[4]]
        if team:
            people = team_block(team)
        else:
            people = '<p class="center">Te atiende el equipo médico de Lustro. <a class="more" href="{R}equipo.html">Ver equipo</a></p>'
        others = [AREAS[(i + k) % len(AREAS)] for k in (1, 2, 3, 4)]
        body = """<section class="area-hero"><div class="wrap split-grid">
  <div class="reveal"><p class="eyebrow"><a href="{{R}}especialidades.html">Especialidades</a> · {name}</p><h1>{claim}</h1>{intro}
    <p class="actions"><a class="btn dark" href="{{R}}reservar.html?area={slug}">Reservar en {name}</a></p></div>
  <div class="split-img tall reveal">{pic}</div>
</div></section>
<section><div class="wrap split-grid"><div class="reveal"><p class="eyebrow">Cuándo consultarnos</p><h2>Señales y motivos</h2></div><ul class="ticks reveal">{cuando}</ul></div></section>
<section class="tint"><div class="wrap"><div class="sec-head reveal"><h2>Qué abordamos</h2></div><div class="quad">{temas}</div></div></section>
<section><div class="wrap"><div class="center narrow reveal"><p class="eyebrow">Equipo</p><h2>Quién te atiende</h2></div>{people}</div></section>
<section><div class="wrap split-grid"><div class="reveal"><p class="eyebrow">{name}</p><h2>Preguntas frecuentes</h2><p class="fine">Información divulgativa. No sustituye a una consulta ni a un diagnóstico.</p></div><div class="reveal">{faqs}</div></div></section>
{rail}""".format(name=a["name"], claim=a["claim"], slug=a["slug"], intro="".join("<p>%s</p>" % p for p in a["intro"]),
                 pic=img(a["img"], "", "", 900, 1100, True), cuando="".join("<li>%s</li>" % x for x in a["cuando"]),
                 temas="".join('<div class="reveal"><h3>%s</h3><p>%s</p></div>' % t for t in a["temas"]),
                 people=people, faqs=acc(a["faqs"]),
                 rail=rail("Sigue explorando", "Otras áreas del Método Lustro.", "".join(card(o) for o in others)))
        page("especialidades/%s.html" % a["slug"], "%s en Madrid · Clínica Lustro" % a["name"], "%s %s" % (a["claim"], a["intro"][0][:110]),
             body + cta(area=a["slug"]), active="especialidades.html")


def equipo():
    groups = [("Dirección médica", ["gabriel"]), ("Odontología y salud oral", ["crespo", "alcantara", "lloveras", "jgonzalez", "jesusg"]),
              ("Medicina y salud sistémica", ["mansilla", "torres"]), ("Estética y cirugía", ["segura", "blanquer"]), ("Nutrición", ["duenas"])]
    by = {t[0]: t for t in TEAM}
    body = hero("longevidad.jpg", "Equipo", "El conocimiento nos une", "El cuidado nos define. Profesionales de distintas especialidades que comparten una misma filosofía.")
    body += """<section class="split"><div class="wrap split-grid"><div class="split-img tall reveal">%s</div><div class="reveal"><p class="eyebrow">Directora médica</p><h2>Dra. Gabriel</h2><p class="fine">%s · N.º col. %s</p>
<blockquote>«Tu valoración empieza escuchándote.»</blockquote><p>La dirección médica coordina el trabajo de las distintas áreas para que cada persona tenga una visión de conjunto y un plan coherente.</p><a class="more" href="{R}reservar.html">Pedir cita</a></div></div></section>""" % (
        img("escalera.jpg", "Dra. Gabriel en la clínica", "", 344, 430), by["gabriel"][1], by["gabriel"][3])
    for title, ids in groups[1:]:
        body += '<section class="tight"><div class="wrap"><div class="sec-head reveal"><h2>%s</h2></div>%s</div></section>' % (title, team_block([by[i] for i in ids]))
    page("equipo.html", "Equipo · Clínica Lustro", "Profesionales de Clínica Lustro en odontología, cardiología, medicina interna, estética, cirugía plástica y nutrición.",
         body + cta(), active="equipo.html")


def visita():
    body = hero("visita.jpg", "Tu primera visita", "Sin prisas y con todo explicado", "Esto es lo que puedes esperar el primer día.")
    body += '<section><div class="wrap narrow"><ol class="timeline">%s</ol></div></section>' % "".join('<li class="reveal"><h3>%s</h3><p>%s</p></li>' % v for v in VISIT)
    body += """<section class="tint"><div class="wrap split-grid"><div class="reveal"><p class="eyebrow">Trae contigo</p><h2>Una pequeña lista</h2></div>
<ul class="ticks reveal"><li>Documento de identidad</li><li>Informes, analíticas y pruebas recientes</li><li>Lista de medicamentos y suplementos</li><li>Alergias conocidas</li><li>Tus dudas, por escrito si lo prefieres</li></ul></div></section>
<section class="split"><div class="wrap split-grid"><div class="split-img">%s</div><div class="reveal"><p class="eyebrow">Dónde estamos</p><h2>%s</h2><p>%s %s</p><ul class="hours">%s</ul><p class="actions"><a class="btn" href="%s" rel="noopener" target="_blank">Cómo llegar</a></p></div></div></section>""" % (
        facade(), C["street"], C["cp"], C["city"], "".join("<li><span>%s</span><span>%s</span></li>" % h for h in HOURS), C["maps"])
    page("primera-visita.html", "Tu primera visita · Clínica Lustro", "Qué esperar en tu primera visita a Clínica Lustro, qué llevar, horario y cómo llegar.",
         body + cta(), active="primera-visita.html")


def cuaderno():
    body = hero("cuaderno.jpg", "Cuaderno de salud", "Para entender, no para alarmar", "Ideas claras sobre prevención. Información general que no sustituye a una consulta.")
    body += '<nav class="wrap chips center" aria-label="Artículos">%s</nav>' % "".join('<a class="chip" href="#%s">%s</a>' % (a[0], a[2]) for a in ARTICLES)
    for slug, cat, title, ps in ARTICLES:
        body += '<article class="story" id="%s"><div class="wrap narrow reveal"><p class="eyebrow">%s</p><h2>%s</h2>%s<p><a class="more" href="{R}reservar.html">Pedir cita</a></p></div></article>' % (
            slug, cat, title, "".join("<p>%s</p>" % p for p in ps))
    page("cuaderno.html", "Cuaderno de salud · Clínica Lustro", "Artículos divulgativos sobre encías, revisiones, corazón, actividad física, sueño, tensión y cuidado de la piel.",
         body + cta(), active="cuaderno.html")


def preguntas():
    body = '<section class="page-head"><div class="wrap narrow center"><p class="eyebrow">Ayuda</p><h1>Preguntas frecuentes</h1><p class="lead">Si no encuentras lo que buscas, llámanos o escríbenos.</p></div></section>'
    for t, items in FAQS:
        body += '<section class="tight"><div class="wrap split-grid"><div class="reveal"><h2>%s</h2></div><div class="reveal">%s</div></div></section>' % (t, acc(items))
    page("preguntas.html", "Preguntas frecuentes · Clínica Lustro", "Citas, horarios, método, cuentas de paciente y protección de datos en Clínica Lustro.", body + cta(), active="preguntas.html")


def calcula():
    body = """<section class="page-head"><div class="wrap narrow center"><p class="eyebrow">Interactivo · unos 3 minutos</p><h1>Calcula tu salud</h1>
<p class="lead">Cinco ámbitos, cinco barras. Una orientación sobre tus hábitos y señales para saber por dónde empezar.</p>
<p class="fine">No es un diagnóstico. Tus respuestas se calculan en tu navegador: no se envían ni se guardan en ningún servidor.</p></div></section>
<section class="tight"><div class="wrap calc"><div id="calc" aria-live="polite"><noscript><p>Activa JavaScript para usar la calculadora.</p></noscript></div></div></section>
<section class="tint"><div class="wrap split-grid"><div class="reveal"><p class="eyebrow">Transparencia</p><h2>Cómo se calcula</h2><p>Cada ámbito puntúa de 0 a 100 según tus respuestas. El índice general es la media de los cinco. Las referencias son recomendaciones públicas para personas adultas.</p></div><div class="reveal">%s</div></div></section>""" % acc([
        ("Corazón y metabolismo", "Tensión arterial según las categorías europeas de 2024 (no elevada por debajo de 120/70, elevada hasta 139/89 e hipertensión a partir de 140/90, siempre que se confirme con varias medidas), tabaco, índice de masa corporal (OMS) y relación entre cintura y estatura (referencia: menos de 0,5)."),
        ("Alimentación", "Fruta y verdura (la OMS recomienda al menos 400 g al día, unas cinco raciones), legumbres, ultraprocesados, bebidas azucaradas y alcohol."),
        ("Movimiento", "OMS: de 150 a 300 minutos semanales de actividad moderada (la intensa cuenta doble) y fuerza al menos dos días."),
        ("Descanso", "De siete a nueve horas de sueño para la mayoría de adultos, calidad del descanso y estrés percibido."),
        ("Boca", "Frecuencia de cepillado, higiene interdental, sangrado de encías, última revisión y otras señales."),
        ("Limitaciones", "Es una herramienta orientativa de hábitos. No está validada como prueba clínica, no estima tu riesgo de enfermedad y no vale para menores de 18 años ni durante el embarazo.")])
    page("calcula.html", "Calcula tu salud · Clínica Lustro", "Calculadora orientativa de salud: boca, corazón y metabolismo, alimentación, movimiento y descanso.",
         body + cta("¿Quieres comentarlo con nosotros?", "En una valoración ponemos tus resultados en contexto."), scripts=["score.js", "calcula.js"], active="calcula.html")


def apps():
    page("reservar.html", "Reservar cita · Clínica Lustro", "Pide tu cita en Clínica Lustro: elige área, día y hora.",
         """<section class="page-head"><div class="wrap narrow center"><p class="eyebrow">Reservas</p><h1>Pide tu cita</h1><p class="lead">Elige área, día y hora. La clínica revisa la solicitud y te la confirma.</p></div></section>
<section class="tight"><div class="wrap app-wrap"><div id="app" aria-live="polite"><noscript><p>Para reservar online activa JavaScript, o llámanos al %s.</p></noscript></div></div></section>""" % C["tel"],
         scripts=["core.js", "store.js", "ui.js", "reservar.js"], app=False, extra_head='<link rel="stylesheet" href="assets/css/app.css">')
    for path, title, h, js in (("acceso.html", "Acceso · Clínica Lustro", "Tu área", "acceso.js"),
                               ("mi-area.html", "Mis citas · Clínica Lustro", "Mis citas", "mi-area.js"),
                               ("admin.html", "Administración · Clínica Lustro", "Administración", "admin.js")):
        page(path, title, "Área privada de Clínica Lustro.",
             '<section class="app-sec"><div class="wrap app-wrap"><p class="eyebrow">Área privada</p><h1 class="app-title">%s</h1><div id="app" aria-live="polite"><noscript><p>Esta zona necesita JavaScript.</p></noscript></div></div></section>' % h,
             scripts=["core.js", "store.js", "ui.js", js], app=True)


def legal():
    head = lambda t: '<section class="page-head"><div class="wrap narrow center"><p class="eyebrow">Legal</p><h1>%s</h1></div></section><section class="tight"><div class="wrap narrow prose">' % t
    draft = '<p class="draft">Borrador pendiente de revisión legal antes de publicarse.</p>'
    who = "%s · CIF %s · %s, %s %s · %s · Centro sanitario autorizado nº %s" % (C["company"], C["cif"], C["street"], C["cp"], C["city"], C["email"], C["cs"])
    page("aviso-legal.html", "Aviso legal · Clínica Lustro", "Aviso legal de Clínica Lustro.", head("Aviso legal") + draft + """
<h2>Titular</h2><p>%s.</p><p>Domicilio social: [pendiente de confirmar]. Datos registrales: [pendiente de confirmar].</p>
<h2>Objeto</h2><p>Este sitio informa sobre los servicios de la clínica y permite solicitar citas y, a las personas dadas de alta, consultar las suyas.</p>
<h2>Información sanitaria</h2><p>Los contenidos son divulgativos. No sustituyen la consulta, el diagnóstico ni el tratamiento de un profesional sanitario. En una urgencia, llama al 112.</p>
<h2>Uso del sitio</h2><p>La persona usuaria se compromete a facilitar datos veraces y propios, a custodiar sus claves y a no usar el sitio con fines ilícitos.</p>
<h2>Propiedad intelectual</h2><p>Textos, marca e imágenes pertenecen a sus titulares y no pueden reutilizarse sin autorización.</p></div></section>""" % who)
    page("privacidad.html", "Privacidad · Clínica Lustro", "Política de privacidad de Clínica Lustro.", head("Política de privacidad") + draft + """
<h2>Responsable</h2><p>%s. Delegado de protección de datos: [pendiente de confirmar].</p>
<h2>Qué datos tratamos</h2><ul><li>Identificación y contacto: nombre, teléfono y correo.</li><li>Citas: área, fecha, hora, estado y el comentario que añadas. El área de una cita puede revelar información sobre tu salud.</li><li>Cuenta de paciente: credenciales de acceso.</li></ul>
<h2>Finalidad y base jurídica</h2><p>Gestionar citas y la relación asistencial (ejecución de la relación y prestación de asistencia sanitaria; para datos de salud, artículo 9.2.h del RGPD y consentimiento cuando proceda). Las comunicaciones comerciales solo se envían con tu consentimiento, que puedes retirar.</p>
<h2>Conservación</h2><p>Las solicitudes de cita que no den lugar a asistencia: [pendiente de fijar plazo]. La documentación clínica, durante los plazos que exige la normativa sanitaria.</p>
<h2>Destinatarios</h2><p>Proveedores de alojamiento y gestión que actúen como encargados del tratamiento: [pendiente de identificar]. No se ceden datos salvo obligación legal.</p>
<h2>Tus derechos</h2><p>Acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a %s. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
<h2>Calculadora de salud</h2><p>Las respuestas de «Calcula tu salud» se procesan solo en tu navegador y no se guardan ni se envían.</p></div></section>""" % (who, C["email"]))
    page("cookies.html", "Cookies · Clínica Lustro", "Política de cookies de Clínica Lustro.", head("Política de cookies") + draft + """
<h2>Qué son</h2><p>Pequeños archivos o datos que una web guarda en tu dispositivo. Aquí incluimos también el almacenamiento local del navegador.</p>
<h2>Qué usamos hoy</h2><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Tipo</th><th>Para qué</th><th>Duración</th></tr></thead><tbody>
<tr><td>lustro_consent</td><td>Necesaria</td><td>Recordar tu elección sobre cookies</td><td>12 meses</td></tr>
<tr><td>lustro_session</td><td>Necesaria</td><td>Mantener tu sesión en el área privada</td><td>8 horas</td></tr>
<tr><td>lustro_db_v1</td><td>Necesaria (modo demostración)</td><td>Guardar en este navegador los datos de prueba de las reservas</td><td>Hasta que se borren</td></tr></tbody></table></div>
<h2>Analítica y publicidad</h2><p>Hoy no hay ningún servicio de medición ni de publicidad conectado. Si se activa alguno, solo funcionará si lo aceptas y esta tabla se actualizará.</p>
<h2>Cambiar tu elección</h2><p><button type="button" class="btn" data-cookies>Configurar cookies</button></p></div></section>""")
    page("404.html", "Página no encontrada · Clínica Lustro", "Página no encontrada.",
         '<section class="page-head"><div class="wrap narrow center"><p class="eyebrow">Error 404</p><h1>Esta página no está</h1><p class="actions"><a class="btn dark" href="{R}index.html">Volver al inicio</a></p></div></section>')


def data_files():
    areas = [{"id": "valoracion", "name": "Primera valoración"}] + [{"id": a["slug"], "name": a["name"]} for a in AREAS]
    pros = [{"name": ("Dra. Gabriel" if t[0] == "gabriel" else t[1]), "areas": t[4]} for t in TEAM]
    with open(os.path.join(ROOT, "assets", "js", "areas.js"), "w", encoding="utf-8") as f:
        f.write("// Generado por tools/build.py — no editar a mano.\nwindow.LUSTRO_AREAS=%s;\nwindow.LUSTRO_TEAM=%s;\n" % (
            json.dumps(areas, ensure_ascii=False), json.dumps(pros, ensure_ascii=False)))
    with open(os.path.join(ROOT, "assets", "img", "favicon.svg"), "w") as f:
        f.write("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' rx='20' fill='#1F2A2A'/><g fill='#F3EFE8'><rect x='8' y='12' width='1.4' height='16'/><rect x='12.5' y='12' width='1.8' height='16'/><rect x='17.5' y='12' width='2.4' height='16'/><rect x='23' y='12' width='3' height='16'/><rect x='29' y='12' width='3.6' height='16'/></g></svg>")


if __name__ == "__main__":
    data_files(); home(); metodo(); especialidades(); equipo(); visita(); cuaderno(); preguntas(); calcula(); apps(); legal()
    print("OK")
