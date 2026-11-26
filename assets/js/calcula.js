(function () {
  "use strict";
  var S = window.LustroScore, root = document.getElementById("calc");
  if (!root) return;
  var answers = {}, i = 0;

  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function numbers(list) {
    if (!list || !list.length) return "";
    return '<div class="nums">' + list.map(function (n) {
      return '<label>' + n.label + (n.help ? ' <span class="fine">· ' + n.help + "</span>" : "") +
        '<input type="number" inputmode="numeric" name="' + n.id + '" min="' + n.min + '" max="' + n.max + '" value="' + (answers[n.id] !== undefined ? esc(answers[n.id]) : "") + '"></label>';
    }).join("") + "</div>";
  }

  function question(q) {
    return '<fieldset class="q"><legend>' + q.q + "</legend>" + (q.help ? "<small>" + q.help + "</small>" : "") + '<div class="opts">' +
      q.opts.map(function (o, k) {
        return '<label><input type="radio" name="' + q.id + '" value="' + k + '"' + (answers[q.id] === k ? " checked" : "") + "><span>" + o.label + "</span></label>";
      }).join("") + "</div></fieldset>";
  }

  function meter(r) {
    return '<div class="meter" aria-hidden="true">' + r.areas.map(function (a) {
      return '<div><i style="height:' + (a.score == null ? 0 : Math.max(4, a.score)) + '%"></i><span>' + a.short + "</span></div>";
    }).join("") + "</div>";
  }

  // Durante el test no se enseña un índice parcial (sería engañoso): solo el avance.
  function paintLive(final) {
    var r = S.evaluate(answers), el = document.getElementById("live");
    if (!el) return;
    if (!el.firstChild) el.innerHTML = '<p class="eyebrow">Tus cinco barras</p><strong></strong>' + meter(r);
    var done = r.areas.filter(function (a) { return a.score != null; }).length;
    el.querySelector("strong").innerHTML = final ? r.total + "<small> / 100</small>" : done + "<small> de 5 ámbitos</small>";
    el.querySelectorAll(".meter i").forEach(function (b, k) { var s = r.areas[k].score; b.style.height = (s == null ? 0 : Math.max(4, s)) + "%"; });
  }

  function render(focus) {
    var step = S.STEPS[i], n = S.STEPS.length;
    root.innerHTML = '<div class="calc-grid"><form class="calc-card" novalidate><div class="progress"><i style="width:' + Math.round((i / n) * 100) + '%"></i></div>' +
      '<p class="eyebrow">Paso ' + (i + 1) + " de " + n + '</p><h2 tabindex="-1">' + step.title + "</h2>" + (step.intro ? '<p class="fine">' + step.intro + "</p><br>" : "") +
      numbers(step.numbers) + step.questions.map(question).join("") +
      '<p class="err" role="alert"></p><div class="calc-nav"><button type="button" class="btn" data-back' + (i === 0 ? " disabled" : "") + ">Atrás</button>" +
      '<button type="submit" class="btn dark">' + (i === n - 1 ? "Ver mi resultado" : "Siguiente") + '</button></div></form><aside class="live" id="live"></aside></div>';
    paintLive(false);
    var form = root.querySelector("form");
    form.addEventListener("input", function (e) {
      var t = e.target;
      if (t.type === "radio") answers[t.name] = Number(t.value); else answers[t.name] = t.value;
      form.querySelector(".err").textContent = "";
      paintLive(false);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var miss = S.missing(step, answers);
      if (miss.length) { form.querySelector(".err").textContent = miss[0]; return; }
      i++; if (i >= n) results(); else render(true);
    });
    form.querySelector("[data-back]").addEventListener("click", function () { if (i > 0) { i--; render(true); } });
    if (focus) { scrollTop(); root.querySelector("h2").focus({ preventScroll: true }); }
  }

  function scrollTop() { var y = root.getBoundingClientRect().top + window.scrollY - 100; if (window.scrollY > y) window.scrollTo({ top: y, behavior: "smooth" }); }

  function results() {
    var r = S.evaluate(answers);
    var metrics = [];
    if (r.bmi != null) metrics.push(["Índice de masa corporal", r.bmi.toLocaleString("es-ES"), r.bmiBand.label + " · referencia 18,5 – 24,9"]);
    if (r.whtr != null) metrics.push(["Cintura / estatura", r.whtr.toLocaleString("es-ES"), r.whtrBand.label + " · referencia < 0,5"]);
    metrics.push(["Actividad semanal", r.minutes + " min", "Equivalente moderado · referencia 150 – 300"]);
    root.innerHTML = '<div class="calc-grid"><div class="calc-card"><p class="eyebrow">Tu resultado orientativo</p><h2 tabindex="-1">' + { ok: "Partes de una buena base", mid: "Tienes margen de mejora", low: "Hay mucho que puedes ganar" }[r.level.id] + "</h2>" +
      "<p>Tu índice general es <b>" + r.total + " de 100</b>. " + (r.focus && r.focus.score < 80 ? "El ámbito por el que más te conviene empezar es <b>" + r.focus.title.toLowerCase() + "</b>." : "Tus cinco ámbitos parten de una buena base.") + "</p>" +
      '<p class="fine">No es un diagnóstico ni calcula tu riesgo de enfermedad. El índice de masa corporal no distingue entre músculo y grasa.</p>' +
      '<div class="actions"><a class="btn dark" href="reservar.html?area=valoracion">Reservar una valoración</a><button type="button" class="btn" data-print>Imprimir o guardar PDF</button><button type="button" class="btn" data-again>Repetir</button></div></div><aside class="live" id="live"></aside></div>' +
      '<div style="margin-top:28px">' + r.flags.map(function (f) { return '<div class="alert" role="alert">' + f + "</div>"; }).join("") +
      '<div class="metrics">' + metrics.map(function (m) { return '<div class="metric"><span class="eyebrow">' + m[0] + "</span><b>" + m[1] + '</b><span class="fine">' + m[2] + "</span></div>"; }).join("") + "</div></div>" +
      '<div class="results" style="margin-top:16px">' + r.areas.map(function (a) {
        return '<div class="res-row"><div class="score lv-' + a.level.id + '">' + a.score + "<small>" + a.level.label + "</small></div><div><h3>" + a.title + "</h3><ul>" +
          a.tips.map(function (t) { return "<li>" + t + "</li>"; }).join("") + '</ul><a class="more" href="especialidades/' + a.area + '.html">Ver especialidad</a></div></div>';
      }).join("") + "</div>";
    paintLive(true);
    root.querySelector("[data-again]").addEventListener("click", function () { answers = {}; i = 0; render(true); });
    root.querySelector("[data-print]").addEventListener("click", function () { window.print(); });
    scrollTop(); root.querySelector("h2").focus({ preventScroll: true });
  }

  render(false);
})();
