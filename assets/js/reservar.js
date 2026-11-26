(function () {
  "use strict";
  var C = window.LustroCore, U = window.LustroUI, cfg = window.LUSTRO_CONFIG, areas = window.LUSTRO_AREAS;
  var root = document.getElementById("app"), db, me = null, week = 0;
  var asked = new URLSearchParams(location.search).get("area");
  var sel = { area: areas.some(function (a) { return a.id === asked; }) ? asked : "", date: "", time: "" };
  var contact = { name: "", phone: "", email: "", notes: "" };
  var today = C.nowMadrid().date;

  window.LustroStore.ready().then(function (s) { db = s; return db.me(); }).then(function (u) {
    me = u;
    if (me && me.role === "paciente") contact = { name: me.name, phone: me.phone, email: me.email, notes: "" };
    render();
  }).catch(function (e) { U.fail(root, e); });

  function step(n, title, body, enabled) {
    return '<section class="panel step' + (enabled ? "" : " off") + '"><h2><span>' + n + "</span>" + title + "</h2>" + (enabled ? body : "") + "</section>";
  }

  function render() {
    var areaBtns = '<div class="pick">' + areas.map(function (a) {
      return '<button type="button" data-area="' + a.id + '" aria-pressed="' + (sel.area === a.id) + '">' + C.esc(a.name) + "</button>";
    }).join("") + "</div>";

    var start = C.addDays(C.monday(today), week * 7), maxWeek = Math.floor(cfg.booking.horizonDays / 7);
    var dayList = [0, 1, 2, 3, 4].map(function (k) { return C.addDays(start, k); });
    var days = '<div class="weeknav"><button type="button" class="btn sm" data-week="-1"' + (week === 0 ? " disabled" : "") + '>← Anterior</button><b>' +
      C.fmtDate(start, { day: "numeric", month: "long" }) + " – " + C.fmtDate(C.addDays(start, 4), { day: "numeric", month: "long", year: "numeric" }) +
      '</b><button type="button" class="btn sm" data-week="1"' + (week >= maxWeek ? " disabled" : "") + '>Siguiente →</button></div><div class="days" id="days">' +
      dayList.map(function (d) {
        return '<button type="button" data-date="' + d + '" aria-pressed="' + (sel.date === d) + '" disabled><small>' + C.fmtDate(d, { weekday: "short" }) + "</small><b>" + C.fmtDate(d, { day: "numeric" }) + "</b><i>…</i></button>";
      }).join("") + '</div><div id="slots"></div>';

    var logged = me && me.role === "paciente";
    var form = '<form id="f" novalidate><div class="grid2">' + U.field("Nombre y apellidos", "name", 'autocomplete="name" required', contact.name) +
      U.field("Teléfono", "phone", 'type="tel" autocomplete="tel" required', contact.phone) +
      U.field("Correo electrónico", "email", 'type="email" autocomplete="email" required' + (logged ? " readonly" : ""), contact.email) + "</div>" +
      '<label class="f"><span>Comentario (opcional)</span><textarea name="notes" maxlength="500" rows="3">' + C.esc(contact.notes) + "</textarea><small>No escribas datos de salud: los hablaremos en persona.</small></label>" +
      '<div class="hp" aria-hidden="true"><label>No rellenar<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="check"><input type="checkbox" name="consent"> <span>He leído y acepto la <a href="privacidad.html" target="_blank">política de privacidad</a>.</span></label>' +
      '<div class="summary" id="summary"></div><p class="err" role="alert"></p><button type="submit" class="btn dark">Solicitar cita</button></form>';

    root.innerHTML = U.demoRibbon(db) + (me ? "" : '<p class="fine">¿Ya tienes cuenta? <a class="link" href="acceso.html">Entra</a> y rellenamos tus datos.</p>') +
      step(1, "¿Qué te interesa?", areaBtns, true) + step(2, "Elige día y hora", days, !!sel.area) + step(3, "Tus datos", form, !!(sel.area && sel.date && sel.time));

    if (sel.area) paintDays(dayList);
    if (document.getElementById("summary")) summary();
  }

  function paintDays(dayList) {
    var area = sel.area;
    Promise.all(dayList.map(function (d) { return db.freeSlots(d, area); })).then(function (all) {
      if (area !== sel.area) return;
      all.forEach(function (slots, k) {
        var b = root.querySelector('[data-date="' + dayList[k] + '"]'); if (!b) return;
        b.disabled = !slots.length;
        b.querySelector("i").textContent = slots.length ? slots.length + " libres" : "—";
      });
      var k = dayList.indexOf(sel.date), box = document.getElementById("slots");
      if (!box) return;
      if (k < 0) { box.innerHTML = '<p class="fine">' + (all.some(function (s) { return s.length; }) ? "Elige un día." : "No quedan horas esta semana. Mira la siguiente.") + "</p>"; return; }
      var groups = [["Mañana", all[k].filter(function (t) { return t < "14:00"; })], ["Tarde", all[k].filter(function (t) { return t >= "14:00"; })]];
      box.innerHTML = groups.filter(function (g) { return g[1].length; }).map(function (g) {
        return "<h3>" + g[0] + '</h3><div class="pick times">' + g[1].map(function (t) { return '<button type="button" data-time="' + t + '" aria-pressed="' + (sel.time === t) + '">' + t + "</button>"; }).join("") + "</div>";
      }).join("");
    }).catch(function (e) { U.toast(e.message, true); });
  }

  function summary() {
    document.getElementById("summary").innerHTML = "<b>" + C.esc(U.areaName(sel.area)) + "</b><br>" + C.fmtDate(sel.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " a las " + sel.time;
  }
  function keep() { var f = document.getElementById("f"); if (f) { var d = U.data(f); contact = { name: d.name, phone: d.phone, email: d.email, notes: d.notes }; } }

  root.addEventListener("click", function (e) {
    var t = e.target.closest("button"); if (!t) return;
    if (t.dataset.area) { keep(); sel.area = t.dataset.area; sel.time = ""; render(); }
    else if (t.dataset.week) { keep(); week += Number(t.dataset.week); sel.date = ""; sel.time = ""; render(); }
    else if (t.dataset.date) { keep(); sel.date = t.dataset.date; sel.time = ""; render(); }
    else if (t.dataset.time) { keep(); sel.time = t.dataset.time; render(); var f = document.getElementById("f"); if (f) f.closest(".panel").scrollIntoView({ behavior: "smooth", block: "start" }); }
  });

  root.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, d = U.data(f), err = f.querySelector(".err"), btn = f.querySelector("[type=submit]");
    if (d.website) return; // trampa antispam
    err.textContent = ""; btn.disabled = true;
    db.createBooking({ name: d.name, phone: d.phone, email: d.email, notes: d.notes, consent: !!d.consent, area: sel.area, date: sel.date, time: sel.time })
      .then(done)
      .catch(function (x) { btn.disabled = false; err.textContent = x.message; if (/disponible/.test(x.message)) { keep(); sel.time = ""; render(); U.toast(x.message, true); } });
  });

  function done(b) {
    var text = "Hola, soy " + b.name + ". Quiero pedir cita en Clínica Lustro.\nÁrea: " + U.areaName(b.area) + "\nDía: " + C.fmtDate(b.date) + " a las " + b.time + "\nTeléfono: " + b.phone + "\nReferencia: " + b.code;
    var wa = "https://wa.me/" + cfg.clinic.wa + "?text=" + encodeURIComponent(text);
    var demo = db.mode === "demo";
    root.innerHTML = U.demoRibbon(db) + '<section class="panel ok" tabindex="-1"><p class="eyebrow">Referencia ' + C.esc(b.code) + "</p><h2>" + (demo ? "Falta un paso" : "Solicitud recibida") + "</h2>" +
      "<p><b>" + C.esc(U.areaName(b.area)) + "</b> · " + C.fmtDate(b.date) + " a las " + b.time + "</p>" +
      (demo ? "<p>Para que la clínica reciba tu solicitud, <b>envíala ahora por WhatsApp</b>. La hora no está confirmada hasta que te respondan.</p>"
        : "<p>La clínica revisará tu solicitud y te confirmará la hora. Todavía no está confirmada.</p>") +
      '<div class="actions">' + (demo ? '<a class="btn dark" href="' + wa + '" target="_blank" rel="noopener">Enviar por WhatsApp</a>' : "") +
      '<button type="button" class="btn" id="ics">Añadir al calendario</button><a class="btn" href="' + (me ? "mi-area.html" : "index.html") + '">' + (me ? "Ver mis citas" : "Volver al inicio") + "</a></div></section>";
    document.getElementById("ics").addEventListener("click", function () { U.download("cita-lustro-" + b.code + ".ics", U.ics(b), "text/calendar;charset=utf-8"); });
    var p = root.querySelector(".ok"); p.scrollIntoView({ block: "center" }); p.focus({ preventScroll: true });
  }
})();
