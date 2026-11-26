(function () {
  "use strict";
  var C = window.LustroCore, U = window.LustroUI, root = document.getElementById("app"), db, me, bookings = [];

  window.LustroStore.ready().then(function (s) { db = s; return db.me(); }).then(function (u) {
    if (!u) { location.href = "acceso.html"; return; }
    if (u.role === "admin") { location.href = "admin.html"; return; }
    me = u;
    return refresh().then(function () { if (me.mustChange) password(true); });
  }).catch(function (e) { U.fail(root, e); });

  function refresh() { return db.listBookings().then(function (l) { bookings = l; render(); }).catch(function (e) { U.toast(e.message, true); }); }

  function card(b, upcoming) {
    return '<article class="appt"><div class="when"><b>' + C.fmtDate(b.date, { day: "numeric" }) + "</b><span>" + C.fmtDate(b.date, { month: "short", year: "numeric" }) + "</span></div>" +
      '<div class="what"><h3>' + C.esc(U.areaName(b.area)) + "</h3><p>" + C.fmtDate(b.date, { weekday: "long" }) + " · " + b.time + (b.professional ? " · " + C.esc(b.professional) : "") + "</p>" +
      "<p>" + U.badge(b.status) + ' <span class="fine">Ref. ' + C.esc(b.code) + "</span></p>" + (b.notes ? '<p class="fine">' + C.esc(b.notes) + "</p>" : "") + "</div>" +
      (upcoming ? '<div class="do"><button type="button" class="btn sm" data-act="move" data-id="' + b.id + '">Cambiar</button><button type="button" class="btn sm" data-act="ics" data-id="' + b.id + '">Calendario</button><button type="button" class="btn sm danger" data-act="cancel" data-id="' + b.id + '">Cancelar</button></div>' : "") + "</article>";
  }

  function render() {
    var up = bookings.filter(function (b) { return C.isUpcoming(b); });
    var past = bookings.filter(function (b) { return !C.isUpcoming(b); }).reverse();
    root.innerHTML = U.demoRibbon(db) + '<div class="bar"><p>Hola, <b>' + C.esc(me.name) + '</b></p><div><a class="btn dark sm" href="reservar.html">Nueva cita</a> <button type="button" class="btn sm" data-act="out">Salir</button></div></div>' +
      '<section class="panel"><h2>Próximas citas</h2>' + (up.length ? up.map(function (b) { return card(b, true); }).join("") : '<p class="empty">No tienes citas pendientes.</p>') + "</section>" +
      '<section class="panel"><h2>Historial</h2>' + (past.length ? past.map(function (b) { return card(b, false); }).join("") : '<p class="empty">Todavía no hay historial.</p>') + "</section>" +
      '<section class="panel"><h2>Mis datos</h2><p><b>' + C.esc(me.name) + "</b><br>" + C.esc(me.email) + "<br>" + C.esc(me.phone || "Sin teléfono") + '</p><div class="actions"><button type="button" class="btn sm" data-act="profile">Editar datos</button>' + (me.demo ? "" : '<button type="button" class="btn sm" data-act="pass">Cambiar contraseña</button>') + '<button type="button" class="btn sm" data-act="export">Descargar mis datos</button></div>' +
      '<p class="fine">Para cancelar tu cuenta o ejercer otros derechos escribe a ' + C.esc(window.LUSTRO_CONFIG.clinic.email) + ".</p></section>";
  }

  function password(forced) {
    U.modal(forced ? "Elige tu contraseña" : "Cambiar contraseña",
      (forced ? "<p>Estás usando una contraseña temporal. Cámbiala para continuar.</p>" : "") +
      U.field(forced ? "Contraseña temporal" : "Contraseña actual", "old", 'type="password" autocomplete="current-password"') +
      U.field("Contraseña nueva", "nw", 'type="password" autocomplete="new-password"', "", "Mínimo 10 caracteres") +
      U.field("Repite la contraseña nueva", "nw2", 'type="password" autocomplete="new-password"'), {
        cancel: !forced,
        onSubmit: function (d) {
          if (d.nw !== d.nw2) throw new Error("Las dos contraseñas nuevas no coinciden.");
          return db.changePassword(d.old, d.nw).then(function (u) { me = u; U.toast("Contraseña actualizada."); });
        }
      });
    if (forced) { var dlg = document.querySelector("dialog.modal:last-of-type"); dlg.addEventListener("close", function () { db.me().then(function (u) { if (u && u.mustChange) password(true); }); }); }
  }

  root.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]"); if (!t) return;
    var act = t.dataset.act, b = bookings.filter(function (x) { return x.id === t.dataset.id; })[0];
    if (act === "out") db.signOut().then(function () { location.href = "acceso.html"; });
    if (act === "ics") U.download("cita-lustro-" + b.code + ".ics", U.ics(b), "text/calendar;charset=utf-8");
    if (act === "cancel") U.confirm("Cancelar cita", "Vas a cancelar " + U.areaName(b.area) + " el " + C.fmtDate(b.date) + " a las " + b.time + ".", "Sí, cancelar", function () {
      return db.cancelBooking(b.id).then(function () { U.toast("Cita cancelada."); return refresh(); });
    });
    if (act === "move") U.modal("Cambiar de día u hora", "<p>" + C.esc(U.areaName(b.area)) + '. La clínica deberá confirmar el cambio.</p><div class="grid2">' +
      U.field("Día", "date", 'type="date" min="' + C.nowMadrid().date + '"', b.date) + '<label class="f"><span>Hora</span><select name="time"></select></label></div>', {
        ok: "Solicitar cambio",
        onOpen: function (f) { U.bindSlots(db, f, { area: b.area, ignoreId: b.id, time: b.time }); },
        onSubmit: function (d) { if (!d.time) throw new Error("Elige una hora libre."); return db.rescheduleBooking(b.id, d.date, d.time).then(function () { U.toast("Cambio solicitado."); return refresh(); }); }
      });
    if (act === "profile") U.modal("Mis datos", U.field("Nombre y apellidos", "name", "", me.name) + U.field("Teléfono", "phone", 'type="tel"', me.phone) + '<p class="fine">Para cambiar el correo, contacta con la clínica.</p>', {
      onSubmit: function (d) { return db.updateProfile(d).then(function (u) { me = u; U.toast("Datos guardados."); render(); }); }
    });
    if (act === "pass") password(false);
    if (act === "export") U.download("mis-datos-lustro.json", JSON.stringify({ cuenta: me, citas: bookings }, null, 2), "application/json");
  });

  window.addEventListener("storage", function () { if (me) db.me().then(function (u) { if (!u) location.href = "acceso.html"; else refresh(); }); });
})();
