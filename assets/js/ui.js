/* Utilidades de interfaz compartidas por reservas, área de paciente y administración. */
(function (global) {
  "use strict";
  var C = global.LustroCore, areas = global.LUSTRO_AREAS || [];

  function areaName(id) { var a = areas.filter(function (x) { return x.id === id; })[0]; return a ? a.name : id; }
  function badge(status) { return '<span class="badge s-' + C.esc(status) + '">' + C.esc(C.STATUS[status] || status) + "</span>"; }
  function options(list, selected) {
    return list.map(function (o) { return '<option value="' + C.esc(o[0]) + '"' + (o[0] === selected ? " selected" : "") + ">" + C.esc(o[1]) + "</option>"; }).join("");
  }
  function field(label, name, attrs, value, help) {
    return '<label class="f"><span>' + label + "</span><input name=\"" + name + '" ' + (attrs || "") + ' value="' + C.esc(value || "") + '">' + (help ? "<small>" + help + "</small>" : "") + "</label>";
  }
  function data(form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { o[k] = v; });
    return o;
  }
  function toast(msg, bad) {
    var host = document.getElementById("toasts");
    if (!host) { host = document.createElement("div"); host.id = "toasts"; host.setAttribute("role", "status"); document.body.appendChild(host); }
    var t = document.createElement("div"); t.className = "toast" + (bad ? " bad" : ""); t.textContent = msg; host.appendChild(t);
    setTimeout(function () { t.remove(); }, bad ? 6000 : 3500);
  }
  /* Diálogo modal. onSubmit puede devolver una promesa; si falla, se muestra el error y no se cierra. */
  function modal(title, body, opts) {
    opts = opts || {};
    var d = document.createElement("dialog"); d.className = "modal"; d.setAttribute("aria-labelledby", "m-t");
    d.innerHTML = '<form method="dialog" novalidate><h2 id="m-t">' + C.esc(title) + "</h2>" + body + '<p class="err" role="alert"></p><div class="m-actions">' +
      (opts.cancel === false ? "" : '<button type="button" class="btn" data-close>Cancelar</button>') +
      '<button type="submit" class="btn dark">' + C.esc(opts.ok || "Guardar") + "</button></div></form>";
    document.body.appendChild(d);
    function close() { d.close(); d.remove(); }
    d.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
    d.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) close(); });
    var form = d.querySelector("form"), btn = form.querySelector("[type=submit]");
    form.addEventListener("submit", function (e) {
      e.preventDefault(); btn.disabled = true;
      Promise.resolve().then(function () { return opts.onSubmit ? opts.onSubmit(data(form), form) : null; })
        .then(close, function (err) { btn.disabled = false; form.querySelector(".err").textContent = err.message; });
    });
    d.showModal();
    if (opts.onOpen) opts.onOpen(form);
    return d;
  }
  function confirmBox(title, text, ok, fn) { return modal(title, "<p>" + C.esc(text) + "</p>", { ok: ok, onSubmit: fn }); }

  /* Rellena un <select name="time"> según área y fecha del formulario. */
  function bindSlots(db, form, opts) {
    opts = opts || {};
    var sel = form.querySelector("[name=time]"), seq = 0;
    function refresh() {
      var date = form.querySelector("[name=date]").value, a = form.querySelector("[name=area]"), area = a ? a.value : opts.area, mine = ++seq;
      var keep = sel.value || opts.time;
      if (!date) { sel.innerHTML = '<option value="">Elige un día</option>'; return; }
      db.freeSlots(date, area, opts.ignoreId).then(function (slots) {
        if (mine !== seq) return;
        sel.innerHTML = slots.length ? options(slots.map(function (s) { return [s, s]; }), keep) : '<option value="">Sin horas libres ese día</option>';
      }).catch(function (e) { toast(e.message, true); });
    }
    form.addEventListener("change", function (e) { if (e.target.name === "date" || e.target.name === "area") refresh(); });
    refresh();
  }

  function download(name, text, type) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain;charset=utf-8" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function ics(b) {
    var stamp = function (d, m) { return d.replace(/-/g, "") + "T" + C.toHM(m).replace(":", "") + "00"; };
    var s = C.toMin(b.time);
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Clinica Lustro//Citas//ES", "BEGIN:VEVENT", "UID:" + (b.id || b.code) + "@clinicalustro",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", "DTSTART;TZID=Europe/Madrid:" + stamp(b.date, s), "DTEND;TZID=Europe/Madrid:" + stamp(b.date, s + (b.duration || 30)),
      "SUMMARY:Cita en Clínica Lustro", "LOCATION:C/ López de Hoyos 69\\, 28002 Madrid", "STATUS:" + (b.status === "confirmada" ? "CONFIRMED" : "TENTATIVE"), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  }
  function demoRibbon(db) {
    return db.mode === "demo" ? '<div class="demo"><b>Modo demostración.</b> Los datos se guardan solo en este navegador y no llegan a la clínica. No introduzcas datos reales de pacientes.</div>' : "";
  }
  function demoAccess(db) {
    if (db.mode !== "demo" || !db.demoAccess) return "";
    return '<div class="panel demo-in"><h2>Probar sin crear nada</h2><p>Entra con un usuario de prueba ya preparado, con citas de ejemplo. No hace falta contraseña.</p>' +
      '<div class="actions"><button type="button" class="btn dark" data-demo="admin">Entrar como administración</button><button type="button" class="btn" data-demo="paciente">Entrar como paciente</button></div></div>';
  }
  function bindDemo(root, db) {
    var buttons = root.querySelectorAll("[data-demo]");
    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(buttons, function (x) { x.disabled = true; });
        db.demoLogin(b.getAttribute("data-demo")).then(function (u) {
          var page = u.role === "admin" ? "admin.html" : "mi-area.html";
          if (location.pathname.slice(-page.length) === page) location.reload(); else location.href = page;
        })
          .catch(function (e) { Array.prototype.forEach.call(buttons, function (x) { x.disabled = false; }); toast(e.message, true); });
      });
    });
  }
  function fail(root, e) { root.innerHTML = '<div class="panel"><p class="err">' + C.esc(e.message) + "</p></div>"; }

  global.LustroUI = { demoAccess: demoAccess, bindDemo: bindDemo, areaName: areaName, badge: badge, options: options, field: field, data: data, toast: toast, modal: modal, confirm: confirmBox, bindSlots: bindSlots, download: download, ics: ics, demoRibbon: demoRibbon, fail: fail };
})(this);
