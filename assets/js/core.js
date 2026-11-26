/* Lógica de citas sin dependencias del navegador (se puede probar con node). */
(function (global) {
  "use strict";
  var TZ = "Europe/Madrid";
  var STATUS = {
    pendiente: "Pendiente", confirmada: "Confirmada", realizada: "Realizada",
    cancelada: "Cancelada", no_asistio: "No asistió"
  };

  function pad(n) { return String(n).padStart(2, "0"); }
  function nowMadrid(d) {
    var p = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d || new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + "-" + p.month + "-" + p.day, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  function utc(iso) { var a = iso.split("-").map(Number); return new Date(Date.UTC(a[0], a[1] - 1, a[2])); }
  function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !isNaN(utc(s)) && utc(s).toISOString().slice(0, 10) === s; }
  function addDays(iso, n) { var d = utc(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function weekday(iso) { return utc(iso).getUTCDay() || 7; }
  function monday(iso) { return addDays(iso, 1 - weekday(iso)); }
  function daysBetween(a, b) { return Math.round((utc(b) - utc(a)) / 864e5); }
  function fmtDate(iso, o) {
    return new Intl.DateTimeFormat("es-ES", Object.assign({ timeZone: "UTC" }, o || { weekday: "long", day: "numeric", month: "long" })).format(utc(iso));
  }
  function toMin(t) { var a = t.split(":").map(Number); return a[0] * 60 + a[1]; }
  function toHM(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }

  function dayRanges(date, cfg) {
    if ((cfg.holidays || []).indexOf(date) >= 0) return [];
    return (cfg.hours[weekday(date)] || []).map(function (r) { return [toMin(r[0]), toMin(r[1])]; });
  }
  function slotsFor(date, cfg) {
    var step = cfg.booking.slotMinutes, out = [];
    dayRanges(date, cfg).forEach(function (r) { for (var m = r[0]; m + step <= r[1]; m += step) out.push(toHM(m)); });
    return out;
  }
  function overlap(a, ad, b, bd) { return a < b + bd && b < a + ad; }
  function blocked(date, start, dur, blocks) {
    return (blocks || []).some(function (b) {
      if (b.date !== date) return false;
      var from = b.from ? toMin(b.from) : 0, to = b.to ? toMin(b.to) : 1440;
      return overlap(start, dur, from, to - from);
    });
  }
  /* busy: [{date?, time, area, duration, id?}] solo citas no canceladas.
     opts: {now, ignoreId, anyTime} — anyTime permite a la administración saltarse antelación y horizonte. */
  function availableSlots(date, area, busy, blocks, cfg, opts) {
    opts = opts || {};
    var now = opts.now || nowMadrid(), dur = cfg.booking.slotMinutes;
    if (!isDate(date)) return [];
    if (!opts.anyTime && (date < now.date || daysBetween(now.date, date) > cfg.booking.horizonDays)) return [];
    return slotsFor(date, cfg).filter(function (t) {
      var s = toMin(t);
      if (!opts.anyTime && date === now.date && s < now.minutes + cfg.booking.minNoticeMinutes) return false;
      if (blocked(date, s, dur, blocks)) return false;
      var n = (busy || []).filter(function (x) {
        if (opts.ignoreId && x.id === opts.ignoreId) return false;
        if (x.date && x.date !== date) return false;
        return x.area === area && overlap(s, dur, toMin(x.time), x.duration || dur);
      }).length;
      return n < cfg.booking.capacity;
    });
  }
  function isUpcoming(b, now) {
    now = now || nowMadrid();
    return b.status !== "cancelada" && b.status !== "realizada" && b.status !== "no_asistio" &&
      (b.date > now.date || (b.date === now.date && toMin(b.time) >= now.minutes));
  }

  function cleanEmail(v) { return String(v || "").trim().toLowerCase(); }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail(v)); }
  function validPhone(v) { var s = String(v || ""); return /^[+\d\s().-]+$/.test(s) && s.replace(/\D/g, "").length >= 9 && s.replace(/\D/g, "").length <= 15; }
  function validName(v) { var s = String(v || "").trim(); return s.length >= 2 && s.length <= 120; }
  function waNumber(phone) { var d = String(phone || "").replace(/\D/g, ""); if (d.indexOf("00") === 0) d = d.slice(2); return d.length === 9 ? "34" + d : d; }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function csv(rows) {
    return rows.map(function (r) {
      return r.map(function (v) {
        var s = String(v == null ? "" : v);
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel
        return '"' + s.replace(/"/g, '""') + '"';
      }).join(";");
    }).join("\r\n");
  }

  var api = { STATUS: STATUS, nowMadrid: nowMadrid, isDate: isDate, addDays: addDays, weekday: weekday, monday: monday, daysBetween: daysBetween, fmtDate: fmtDate, toMin: toMin, toHM: toHM, dayRanges: dayRanges, slotsFor: slotsFor, availableSlots: availableSlots, isUpcoming: isUpcoming, cleanEmail: cleanEmail, validEmail: validEmail, validPhone: validPhone, validName: validName, waNumber: waNumber, esc: esc, csv: csv };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else global.LustroCore = api;
})(this);
