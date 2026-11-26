(function () {
  "use strict";
  var C = window.LustroCore, U = window.LustroUI, cfg = window.LUSTRO_CONFIG, areas = window.LUSTRO_AREAS, team = window.LUSTRO_TEAM;
  var root = document.getElementById("app"), db, me, bookings = [], users = [], blocks = [];
  var today = C.nowMadrid().date;
  var view = { tab: "hoy", day: today, week: C.monday(today), q: "", status: "", area: "", when: "futuras", pq: "" };
  var TABS = [["hoy", "Resumen"], ["agenda", "Agenda"], ["reservas", "Reservas"], ["pacientes", "Pacientes y altas"], ["bloqueos", "Horarios y bloqueos"], ["datos", "Datos"]];

  window.LustroStore.ready().then(function (s) { db = s; return db.me(); }).then(function (u) {
    if (u && u.role === "admin") { me = u; if (location.hash) view.tab = TABS.some(function (t) { return "#" + t[0] === location.hash; }) ? location.hash.slice(1) : "hoy"; return refresh().then(function () { if (me.mustChange) password(); }); }
    if (u) { location.href = "mi-area.html"; return; }
    return db.needsSetup().then(function (n) { n ? setup() : login(); });
  }).catch(function (e) { U.fail(root, e); });

  /* ---------- acceso ---------- */
  function authForm(title, intro, fields, button, onSubmit) {
    root.innerHTML = U.demoRibbon(db) + U.demoAccess(db) + '<form class="panel auth" novalidate><h2>' + title + "</h2>" + intro + fields + '<p class="err" role="alert"></p><button class="btn dark" type="submit">' + button + "</button></form>";
    U.bindDemo(root, db);
    var f = root.querySelector("form");
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var b = f.querySelector("[type=submit]"); b.disabled = true; f.querySelector(".err").textContent = "";
      Promise.resolve().then(function () { return onSubmit(U.data(f)); }).then(function () { location.reload(); }).catch(function (x) { b.disabled = false; f.querySelector(".err").textContent = x.message; });
    });
  }
  function setup() {
    authForm("Crea la cuenta de administración", "<p>Es la primera vez que se abre el panel en este navegador.</p>",
      U.field("Nombre", "name", 'autocomplete="name"') + U.field("Correo electrónico", "email", 'type="email" autocomplete="username"') +
      U.field("Contraseña", "password", 'type="password" autocomplete="new-password"', "", "Mínimo 10 caracteres") + U.field("Repite la contraseña", "password2", 'type="password" autocomplete="new-password"'),
      "Crear cuenta", function (d) { if (d.password !== d.password2) throw new Error("Las contraseñas no coinciden."); return db.setupAdmin(d); });
  }
  function login() {
    authForm("Acceso de administración", "", U.field("Correo electrónico", "email", 'type="email" autocomplete="username"') + U.field("Contraseña", "password", 'type="password" autocomplete="current-password"'),
      "Entrar", function (d) { return db.signIn(d.email, d.password).then(function (u) { if (u.role !== "admin") return db.signOut().then(function () { throw new Error("Esta cuenta no es de administración."); }); }); });
  }
  function password() {
    U.modal("Elige tu contraseña", U.field("Contraseña temporal", "old", 'type="password"') + U.field("Contraseña nueva", "nw", 'type="password"', "", "Mínimo 10 caracteres") + U.field("Repítela", "nw2", 'type="password"'), {
      cancel: false, onSubmit: function (d) { if (d.nw !== d.nw2) throw new Error("No coinciden."); return db.changePassword(d.old, d.nw).then(function (u) { me = u; U.toast("Contraseña actualizada."); }); }
    });
  }

  function refresh() {
    return Promise.all([db.listBookings(), db.listUsers(), db.listBlocks()]).then(function (r) { bookings = r[0]; users = r[1]; blocks = r[2]; render(); })
      .catch(function (e) { U.toast(e.message, true); if (/sesión/.test(e.message)) login(); });
  }
  function done(msg) { return function () { U.toast(msg); return refresh(); }; }
  function act(promise, msg) { promise.then(done(msg)).catch(function (e) { U.toast(e.message, true); }); }

  /* ---------- piezas ---------- */
  function live(b) { return b.status !== "cancelada"; }
  function rowActions(b) {
    var a = [];
    if (b.status === "pendiente") a.push(["confirm", "Confirmar", "dark"]);
    if (b.status === "confirmada" && b.date <= today) a.push(["done", "Realizada", "dark"], ["noshow", "No asistió", ""]);
    a.push(["edit", "Editar", ""]);
    return a.map(function (x) { return '<button type="button" class="btn sm ' + x[2] + '" data-act="' + x[0] + '" data-id="' + b.id + '">' + x[1] + "</button>"; }).join("");
  }
  function table(list, withDate) {
    if (!list.length) return '<p class="empty">No hay citas.</p>';
    return '<div class="table-wrap"><table class="list"><thead><tr>' + (withDate ? "<th>Día</th>" : "") + "<th>Hora</th><th>Paciente</th><th>Área</th><th>Estado</th><th></th></tr></thead><tbody>" +
      list.map(function (b) {
        return "<tr>" + (withDate ? '<td data-l="Día">' + C.fmtDate(b.date, { weekday: "short", day: "numeric", month: "short" }) + "</td>" : "") +
          '<td data-l="Hora"><b>' + b.time + '</b></td><td data-l="Paciente">' + C.esc(b.name) + '<br><span class="fine">' + C.esc(b.phone) + (b.notes ? " · 💬 " + C.esc(b.notes) : "") + "</span></td>" +
          '<td data-l="Área">' + C.esc(U.areaName(b.area)) + (b.professional ? '<br><span class="fine">' + C.esc(b.professional) + "</span>" : "") + '</td><td data-l="Estado">' + U.badge(b.status) + '</td><td class="do">' + rowActions(b) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function tile(n, label, go) { return '<button type="button" class="tile" data-act="goto" data-id="' + go + '"><b>' + n + "</b><span>" + label + "</span></button>"; }

  /* ---------- pestañas ---------- */
  var RENDER = {
    hoy: function () {
      var todays = bookings.filter(function (b) { return b.date === today && live(b); });
      var pending = bookings.filter(function (b) { return b.status === "pendiente" && b.date >= today; });
      var week = bookings.filter(function (b) { return live(b) && b.date >= C.monday(today) && b.date <= C.addDays(C.monday(today), 6); });
      var since = C.addDays(today, -30), closed = bookings.filter(function (b) { return b.date >= since && b.date <= today && (b.status === "realizada" || b.status === "no_asistio"); });
      var noshow = closed.filter(function (b) { return b.status === "no_asistio"; }).length;
      var byArea = areas.map(function (a) { return [a.name, week.filter(function (b) { return b.area === a.id; }).length]; }).filter(function (x) { return x[1]; }).sort(function (a, b) { return b[1] - a[1]; });
      var max = byArea.length ? byArea[0][1] : 1;
      return '<div class="tiles">' + tile(todays.length, "Citas hoy", "agenda") + tile(pending.length, "Por confirmar", "pendientes") + tile(week.length, "Esta semana", "agenda") +
        tile(users.filter(function (u) { return u.role === "paciente" && u.active; }).length, "Pacientes activos", "pacientes") + "</div>" +
        '<section class="panel"><h2>Por confirmar</h2>' + table(pending, true) + "</section>" +
        '<section class="panel"><h2>Hoy · ' + C.fmtDate(today) + "</h2>" + table(todays, false) + "</section>" +
        '<div class="two"><section class="panel"><h2>Esta semana por área</h2>' + (byArea.length ? byArea.map(function (x) { return '<div class="hbar"><span>' + C.esc(x[0]) + '</span><i style="width:' + Math.round(x[1] / max * 100) + '%"></i><b>' + x[1] + "</b></div>"; }).join("") : '<p class="empty">Sin citas esta semana.</p>') + "</section>" +
        '<section class="panel"><h2>Ausencias · 30 días</h2><p class="big-n">' + noshow + "<small> de " + closed.length + " citas cerradas</small></p></section></div>";
    },
    agenda: function () {
      var days = [0, 1, 2, 3, 4].map(function (k) { return C.addDays(view.week, k); });
      var times = [];
      days.forEach(function (d) { C.slotsFor(d, cfg).forEach(function (t) { if (times.indexOf(t) < 0) times.push(t); }); });
      bookings.forEach(function (b) { if (live(b) && days.indexOf(b.date) >= 0 && times.indexOf(b.time) < 0) times.push(b.time); });
      times.sort();
      var head = "<tr><th></th>" + days.map(function (d) { return '<th class="' + (d === today ? "today" : "") + '">' + C.fmtDate(d, { weekday: "short", day: "numeric", month: "short" }) + "</th>"; }).join("") + "</tr>";
      var body = times.map(function (t) {
        return "<tr><th>" + t + "</th>" + days.map(function (d) {
          var here = bookings.filter(function (b) { return live(b) && b.date === d && b.time === t; });
          var open = C.slotsFor(d, cfg).indexOf(t) >= 0;
          var isBlocked = open && C.availableSlots(d, "__", [], blocks, cfg, { anyTime: true }).indexOf(t) < 0;
          return '<td class="' + (!open ? "closed" : isBlocked ? "blocked" : "") + '">' + here.map(function (b) {
            return '<button type="button" class="ev s-' + b.status + '" data-act="edit" data-id="' + b.id + '"><b>' + C.esc(b.name) + "</b><span>" + C.esc(U.areaName(b.area)) + "</span></button>";
          }).join("") + (open && !isBlocked ? '<button type="button" class="add" data-act="new" data-date="' + d + '" data-time="' + t + '" aria-label="Nueva cita ' + C.fmtDate(d) + " " + t + '">+</button>' : isBlocked && !here.length ? '<span class="fine">Bloqueado</span>' : "") + "</td>";
        }).join("") + "</tr>";
      }).join("");
      return '<div class="weeknav"><button type="button" class="btn sm" data-act="week" data-id="-1">← Semana</button><b>' + C.fmtDate(days[0], { day: "numeric", month: "long" }) + " – " + C.fmtDate(days[4], { day: "numeric", month: "long", year: "numeric" }) +
        '</b><span><button type="button" class="btn sm" data-act="week" data-id="0">Hoy</button> <button type="button" class="btn sm" data-act="week" data-id="1">Semana →</button></span></div>' +
        '<div class="table-wrap agenda-wrap"><table class="agenda"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>" +
        '<p class="legend">' + U.badge("pendiente") + " " + U.badge("confirmada") + " " + U.badge("realizada") + " " + U.badge("no_asistio") + "</p>";
    },
    reservas: function () {
      return '<div class="filters"><label class="f"><span>Buscar</span><input id="q" type="search" placeholder="Nombre, teléfono, correo o referencia" value="' + C.esc(view.q) + '"></label>' +
        '<label class="f"><span>Cuándo</span><select data-filter="when">' + U.options([["futuras", "Desde hoy"], ["pasadas", "Anteriores"], ["todas", "Todas"]], view.when) + "</select></label>" +
        '<label class="f"><span>Estado</span><select data-filter="status">' + U.options([["", "Todos"]].concat(Object.keys(C.STATUS).map(function (k) { return [k, C.STATUS[k]]; })), view.status) + "</select></label>" +
        '<label class="f"><span>Área</span><select data-filter="area">' + U.options([["", "Todas"]].concat(areas.map(function (a) { return [a.id, a.name]; })), view.area) + "</select></label>" +
        '<button type="button" class="btn sm" data-act="csv">Exportar CSV</button></div><section class="panel" id="results">' + results() + "</section>";
    },
    pacientes: function () {
      return '<div class="filters"><label class="f"><span>Buscar</span><input id="pq" type="search" placeholder="Nombre, correo o teléfono" value="' + C.esc(view.pq) + '"></label><button type="button" class="btn dark sm" data-act="alta">Dar de alta</button></div><section class="panel" id="people">' + people() + "</section>";
    },
    bloqueos: function () {
      var next = blocks.filter(function (b) { return b.date >= today; });
      var names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      return '<div class="two"><section class="panel"><h2>Bloquear agenda</h2><p class="fine">Vacaciones, festivos o huecos no disponibles.</p><form id="block" novalidate><div class="grid2">' +
        U.field("Desde el día", "date", 'type="date" min="' + today + '"') + U.field("Hasta el día (opcional)", "until", 'type="date" min="' + today + '"') +
        U.field("Hora inicio (opcional)", "from", 'type="time"') + U.field("Hora fin (opcional)", "to", 'type="time"') + "</div>" + U.field("Motivo", "reason", 'maxlength="120"') +
        '<p class="err" role="alert"></p><button class="btn dark sm" type="submit">Bloquear</button></form></section>' +
        '<section class="panel"><h2>Horario habitual</h2><ul class="hours">' + names.map(function (n, k) { var r = cfg.hours[k + 1]; return "<li><span>" + n + "</span><span>" + (r ? r.map(function (x) { return x.join(" – "); }).join(" · ") : "Cerrado") + "</span></li>"; }).join("") +
        '</ul><p class="fine">Citas de ' + cfg.booking.slotMinutes + " minutos, " + cfg.booking.capacity + " por área y hora. Se cambia en <code>assets/js/config.js</code>" + (db.mode === "supabase" ? " y en la base de datos" : "") + ".</p><p class=\"fine\">Festivos: " + cfg.holidays.map(function (h) { return C.fmtDate(h, { day: "numeric", month: "short", year: "numeric" }); }).join(", ") + ".</p></section></div>" +
        '<section class="panel"><h2>Bloqueos activos</h2>' + (next.length ? '<div class="table-wrap"><table class="list"><tbody>' + next.map(function (b) {
          return '<tr><td data-l="Día">' + C.fmtDate(b.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) + '</td><td data-l="Horas">' + (b.from ? b.from.slice(0, 5) + " – " + b.to.slice(0, 5) : "Todo el día") + '</td><td data-l="Motivo">' + C.esc(b.reason || "—") + '</td><td class="do"><button type="button" class="btn sm" data-act="unblock" data-id="' + b.id + '">Quitar</button></td></tr>';
        }).join("") + "</tbody></table></div>" : '<p class="empty">No hay bloqueos.</p>') + "</section>";
    },
    datos: function () {
      var demo = db.mode === "demo";
      return '<div class="two"><section class="panel"><h2>Copia y exportación</h2><p>' + bookings.length + " citas y " + users.length + ' cuentas.</p><div class="actions"><button type="button" class="btn sm" data-act="csv-all">Citas en CSV</button><button type="button" class="btn sm" data-act="json">Copia completa (JSON)</button></div><p class="fine">Los archivos contienen datos personales: guárdalos en un lugar seguro.</p></section>' +
        '<section class="panel"><h2>Conexión</h2><p>' + (demo ? "<b>Modo demostración.</b> Todo vive en este navegador. Para uso real, conecta una base de datos (ver <code>supabase/LEEME.md</code>)." : "<b>Conectado a la base de datos.</b>") + "</p>" +
        (demo ? '<div class="actions"><button type="button" class="btn sm" data-act="seed">Cargar datos de ejemplo</button><button type="button" class="btn sm danger" data-act="wipe">Borrar todo</button></div>' : "") + "</section></div>";
    }
  };

  function filtered() {
    var q = view.q.trim().toLowerCase();
    var l = bookings.filter(function (b) {
      if (view.when === "futuras" && b.date < today) return false;
      if (view.when === "pasadas" && b.date >= today) return false;
      if (view.status && b.status !== view.status) return false;
      if (view.area && b.area !== view.area) return false;
      return !q || [b.name, b.phone, b.email, b.code].join(" ").toLowerCase().indexOf(q) >= 0;
    });
    return view.when === "pasadas" ? l.reverse() : l;
  }
  function results() { var l = filtered(); return '<p class="fine">' + l.length + (l.length === 1 ? " cita" : " citas") + "</p>" + table(l, true); }
  function people() {
    var q = view.pq.trim().toLowerCase();
    var l = users.filter(function (u) { return !q || [u.name, u.email, u.phone].join(" ").toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return a.name.localeCompare(b.name, "es"); });
    if (!l.length) return '<p class="empty">No hay cuentas.</p>';
    return '<div class="table-wrap"><table class="list"><thead><tr><th>Nombre</th><th>Contacto</th><th>Citas</th><th>Cuenta</th><th></th></tr></thead><tbody>' + l.map(function (u) {
      var n = bookings.filter(function (b) { return b.patientId === u.id; }).length;
      return '<tr><td data-l="Nombre"><b>' + C.esc(u.name) + "</b>" + (u.role === "admin" ? '<br><span class="fine">Administración</span>' : "") + '</td><td data-l="Contacto">' + C.esc(u.email) + '<br><span class="fine">' + C.esc(u.phone) + '</span></td><td data-l="Citas">' + n + '</td><td data-l="Cuenta">' +
        (u.active ? '<span class="badge s-confirmada">Activa</span>' : '<span class="badge s-cancelada">Desactivada</span>') + (u.mustChange ? ' <span class="badge s-pendiente">Sin estrenar</span>' : "") + '</td><td class="do">' +
        (u.role === "paciente" ? '<button type="button" class="btn sm dark" data-act="new-for" data-id="' + u.id + '">Cita</button><button type="button" class="btn sm" data-act="history" data-id="' + u.id + '">Historial</button>' : "") +
        (u.id !== me.id ? '<button type="button" class="btn sm" data-act="user" data-id="' + u.id + '">Editar</button><button type="button" class="btn sm" data-act="reset" data-id="' + u.id + '">Nueva clave</button>' : "") + "</td></tr>";
    }).join("") + "</tbody></table></div>";
  }

  function render() {
    var pend = bookings.filter(function (b) { return b.status === "pendiente" && b.date >= today; }).length;
    root.innerHTML = U.demoRibbon(db) + '<div class="bar"><p><b>' + C.esc(me.name) + '</b></p><div><button type="button" class="btn dark sm" data-act="new">Nueva cita</button> <button type="button" class="btn sm" data-act="out">Salir</button></div></div>' +
      '<div class="tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (view.tab === t[0]) + '" data-act="tab" data-id="' + t[0] + '">' + t[1] + (t[0] === "reservas" && pend ? ' <em>' + pend + "</em>" : "") + "</button>"; }).join("") + "</div>" +
      '<div role="tabpanel">' + RENDER[view.tab]() + "</div>";
  }

  /* ---------- diálogos ---------- */
  function bookingDialog(b, preset) {
    var isNew = !b; b = b || Object.assign({ area: "valoracion", date: today, time: "", status: "confirmada", name: "", phone: "", email: "", professional: "", adminNotes: "", patientId: "" }, preset || {});
    var patients = users.filter(function (u) { return u.role === "paciente" && u.active; });
    var pros = [["", "Sin asignar"]].concat(team.map(function (t) { return [t.name, t.name]; }));
    var wa = !isNew ? "https://wa.me/" + C.waNumber(b.phone) + "?text=" + encodeURIComponent("Hola " + b.name.split(" ")[0] + ", te escribimos de Clínica Lustro sobre tu cita del " + C.fmtDate(b.date) + " a las " + b.time + ".") : "";
    U.modal(isNew ? "Nueva cita" : "Cita " + b.code,
      '<label class="f"><span>Paciente dado de alta</span><select name="patientId">' + U.options([["", "— Sin cuenta —"]].concat(patients.map(function (u) { return [u.id, u.name + " · " + u.email]; })), b.patientId || "") + "</select></label>" +
      '<div class="grid2">' + U.field("Nombre y apellidos", "name", "", b.name) + U.field("Teléfono", "phone", 'type="tel"', b.phone) + U.field("Correo (opcional)", "email", 'type="email"', b.email) +
      '<label class="f"><span>Área</span><select name="area">' + U.options(areas.map(function (a) { return [a.id, a.name]; }), b.area) + "</select></label>" +
      U.field("Día", "date", 'type="date"', b.date) + '<label class="f"><span>Hora</span><select name="time"></select></label>' +
      '<label class="f"><span>Profesional</span><select name="professional">' + U.options(pros, b.professional) + "</select></label>" +
      '<label class="f"><span>Estado</span><select name="status">' + U.options(Object.keys(C.STATUS).map(function (k) { return [k, C.STATUS[k]]; }), b.status) + "</select></label></div>" +
      (b.notes ? '<p class="fine"><b>Comentario del paciente:</b> ' + C.esc(b.notes) + "</p>" : "") +
      '<label class="f"><span>Nota interna (el paciente no la ve)</span><textarea name="adminNotes" rows="2" maxlength="500">' + C.esc(b.adminNotes || "") + "</textarea></label>" +
      (!isNew ? '<p class="inline"><a class="link" href="' + wa + '" target="_blank" rel="noopener">Escribir por WhatsApp</a> <button type="button" class="link" data-ics>Archivo de calendario</button> <button type="button" class="link danger" data-del>Eliminar cita</button></p>' : ""), {
        ok: isNew ? "Crear cita" : "Guardar",
        onOpen: function (f) {
          U.bindSlots(db, f, { ignoreId: b.id, time: b.time });
          f.querySelector("[name=patientId]").addEventListener("change", function (e) {
            var u = users.filter(function (x) { return x.id === e.target.value; })[0];
            if (u) { f.querySelector("[name=name]").value = u.name; f.querySelector("[name=phone]").value = u.phone; f.querySelector("[name=email]").value = u.email; }
          });
          var ics = f.querySelector("[data-ics]"); if (ics) ics.addEventListener("click", function () { U.download("cita-lustro-" + b.code + ".ics", U.ics(b), "text/calendar;charset=utf-8"); });
          var del = f.querySelector("[data-del]"); if (del) del.addEventListener("click", function () {
            f.closest("dialog").close(); f.closest("dialog").remove();
            U.confirm("Eliminar cita", "Se borrará la cita de " + b.name + " y no se puede deshacer. Si solo se ha anulado, mejor cambia su estado a Cancelada.", "Eliminar", function () { return db.deleteBooking(b.id).then(done("Cita eliminada.")); });
          });
        },
        onSubmit: function (d) {
          if (!d.time && d.status !== "cancelada") throw new Error("Elige una hora libre.");
          if (!d.time) d.time = b.time;
          d.patientId = d.patientId || null;
          return (isNew ? db.createBooking(d) : db.updateBooking(b.id, d)).then(done(isNew ? "Cita creada." : "Cita guardada."));
        }
      });
  }

  function showAccess(r, title) {
    var u = r.user;
    if (!r.tempPassword) { U.modal(title, "<p>Hemos enviado a <b>" + C.esc(u.email) + "</b> un correo con su enlace de acceso.</p>", { ok: "Entendido", cancel: false }); return; }
    var url = location.href.replace(/admin\.html.*$/, "acceso.html");
    var msg = "Hola " + u.name.split(" ")[0] + ", ya tienes tu área en Clínica Lustro.\nEntra en: " + url + "\nUsuario: " + u.email + "\nContraseña temporal: " + r.tempPassword + "\nTe pedirá cambiarla al entrar.";
    U.modal(title, '<p>Entrega estos datos a la persona. <b>La contraseña solo se muestra ahora.</b></p><label class="f"><span>Mensaje</span><textarea rows="6" readonly>' + C.esc(msg) + "</textarea></label>" +
      '<p class="inline"><button type="button" class="link" data-copy>Copiar mensaje</button>' + (u.phone ? ' <a class="link" target="_blank" rel="noopener" href="https://wa.me/' + C.waNumber(u.phone) + "?text=" + encodeURIComponent(msg) + '">Enviar por WhatsApp</a>' : "") + "</p>", {
        ok: "Hecho", cancel: false,
        onOpen: function (f) { f.querySelector("[data-copy]").addEventListener("click", function () { var t = f.querySelector("textarea"); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(msg) : Promise.reject()).then(function () { U.toast("Copiado."); }, function () { U.toast("Selecciona el texto y cópialo.", true); }); }); }
      });
  }

  function userFields(u) {
    return U.field("Nombre y apellidos", "name", "", u.name) + U.field("Correo electrónico", "email", 'type="email"' + (db.mode === "supabase" && u.id ? " readonly" : ""), u.email) + U.field("Teléfono", "phone", 'type="tel"', u.phone);
  }

  /* ---------- eventos ---------- */
  root.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]"); if (!t || !me) return;
    var a = t.dataset.act, id = t.dataset.id;
    var b = bookings.filter(function (x) { return x.id === id; })[0], u = users.filter(function (x) { return x.id === id; })[0];
    if (a === "tab") { view.tab = id; history.replaceState(null, "", "#" + id); render(); root.querySelector('[data-act=tab][data-id="' + id + '"]').focus(); }
    else if (a === "goto") { if (id === "pendientes") { view.tab = "reservas"; view.status = "pendiente"; view.when = "futuras"; view.q = ""; view.area = ""; } else view.tab = id; render(); }
    else if (a === "out") db.signOut().then(function () { location.href = "admin.html"; });
    else if (a === "week") { view.week = id === "0" ? C.monday(today) : C.addDays(view.week, 7 * Number(id)); render(); }
    else if (a === "new") bookingDialog(null, t.dataset.date ? { date: t.dataset.date, time: t.dataset.time } : null);
    else if (a === "new-for") bookingDialog(null, { patientId: u.id, name: u.name, phone: u.phone, email: u.email });
    else if (a === "edit") bookingDialog(b);
    else if (a === "confirm") act(db.updateBooking(id, { status: "confirmada" }), "Cita confirmada.");
    else if (a === "done") act(db.updateBooking(id, { status: "realizada" }), "Marcada como realizada.");
    else if (a === "noshow") act(db.updateBooking(id, { status: "no_asistio" }), "Marcada como no asistida.");
    else if (a === "history") U.modal("Citas de " + u.name, table(bookings.filter(function (x) { return x.patientId === u.id; }), true).replace(/<td class="do">.*?<\/td>/g, "<td></td>"), { ok: "Cerrar", cancel: false });
    else if (a === "alta") U.modal("Dar de alta", userFields({}) + '<label class="f"><span>Tipo de cuenta</span><select name="role">' + U.options([["paciente", "Paciente"], ["admin", "Administración"]], "paciente") + '</select></label><label class="check"><input type="checkbox" name="informed"> <span>La persona ha sido informada sobre el tratamiento de sus datos.</span></label>', {
      ok: "Crear cuenta",
      onSubmit: function (d) { if (!d.informed) throw new Error("Confirma que la persona ha sido informada."); return db.createUser(d).then(function (r) { return refresh().then(function () { setTimeout(function () { showAccess(r, "Cuenta creada"); }, 30); }); }); }
    });
    else if (a === "user") U.modal("Editar cuenta", userFields(u) + '<label class="check"><input type="checkbox" name="active"' + (u.active ? " checked" : "") + '> <span>Cuenta activa</span></label><p class="inline"><button type="button" class="link danger" data-deluser>Borrar cuenta</button></p>', {
      onOpen: function (f) { f.querySelector("[data-deluser]").addEventListener("click", function () {
        f.closest("dialog").close(); f.closest("dialog").remove();
        U.confirm("Borrar cuenta", "Se borrará la cuenta de " + u.name + " y no se puede deshacer. Sus citas se conservan en la agenda, sin cuenta vinculada.", "Borrar", function () { return db.deleteUser(u.id).then(done("Cuenta borrada.")); });
      }); },
      onSubmit: function (d) { return db.updateUser(u.id, { name: d.name, email: d.email, phone: d.phone, active: !!d.active }).then(done("Cuenta guardada.")); }
    });
    else if (a === "reset") U.confirm("Nueva contraseña", "La contraseña actual de " + u.name + " dejará de funcionar.", "Generar", function () { return db.resetPassword(u.id).then(function (r) { return refresh().then(function () { setTimeout(function () { showAccess(r, "Acceso renovado"); }, 30); }); }); });
    else if (a === "unblock") act(db.removeBlock(id), "Bloqueo quitado.");
    else if (a === "csv" || a === "csv-all") {
      var list = a === "csv" ? filtered() : bookings;
      var rows = [["Referencia", "Día", "Hora", "Área", "Estado", "Paciente", "Teléfono", "Correo", "Profesional", "Comentario", "Nota interna", "Origen"]].concat(list.map(function (x) { return [x.code, x.date, x.time, U.areaName(x.area), C.STATUS[x.status], x.name, x.phone, x.email, x.professional, x.notes, x.adminNotes, x.source]; }));
      U.download("citas-lustro-" + today + ".csv", "﻿" + C.csv(rows), "text/csv;charset=utf-8");
    }
    else if (a === "json") db.exportAll().then(function (d) { U.download("copia-lustro-" + today + ".json", JSON.stringify(d, null, 2), "application/json"); }).catch(function (x) { U.toast(x.message, true); });
    else if (a === "seed") act(db.seedDemo(), "Datos de ejemplo cargados.");
    else if (a === "wipe") U.modal("Borrar todo", "<p>Se borrarán todas las citas, cuentas y bloqueos de este navegador. No se puede deshacer.</p>" + U.field("Escribe BORRAR para confirmar", "word", 'autocomplete="off"'), {
      ok: "Borrar todo", onSubmit: function (d) { if (d.word !== "BORRAR") throw new Error("Escribe BORRAR en mayúsculas."); return db.wipe().then(function () { location.reload(); }); }
    });
  });
  root.addEventListener("input", function (e) {
    if (e.target.id === "q") { view.q = e.target.value; document.getElementById("results").innerHTML = results(); }
    if (e.target.id === "pq") { view.pq = e.target.value; document.getElementById("people").innerHTML = people(); }
  });
  root.addEventListener("change", function (e) { var k = e.target.dataset && e.target.dataset.filter; if (k) { view[k] = e.target.value; document.getElementById("results").innerHTML = results(); } });
  root.addEventListener("submit", function (e) {
    if (e.target.id !== "block") return;
    e.preventDefault(); var f = e.target, d = U.data(f);
    var hit = bookings.filter(function (b) { return live(b) && b.date >= d.date && b.date <= (d.until || d.date) && (!d.from || !d.to || (b.time >= d.from && b.time < d.to)); }).length;
    db.addBlock(d).then(function (n) { U.toast(n + (n === 1 ? " día bloqueado." : " días bloqueados.") + (hit ? " Ojo: hay " + hit + " cita(s) en ese periodo; revísalas." : ""), !!hit); return refresh(); }).catch(function (x) { f.querySelector(".err").textContent = x.message; });
  });
  window.addEventListener("storage", function () { if (me && !document.querySelector("dialog[open]")) refresh(); });
})();
