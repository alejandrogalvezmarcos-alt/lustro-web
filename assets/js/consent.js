/* Banner de cookies y consentimiento.
   - Nada no esencial se carga antes de aceptar.
   - "Rechazar" y "Aceptar" tienen el mismo peso visual.
   - Google Consent Mode v2: todo denegado por defecto. */
(function () {
  "use strict";
  var cfg = window.LUSTRO_CONFIG || {}, cc = cfg.consent || {}, ids = cfg.analytics || {};
  var KEY = "lustro_consent", root = document.body.getAttribute("data-root") || "";
  var loaded = {}, listeners = [];

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (!v || v.v !== (cc.version || 1)) return null;
      if (Date.now() - v.ts > (cc.months || 12) * 30 * 864e5) return null;
      return v;
    } catch (e) { return null; }
  }
  var state = read();

  function script(src) { var s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); }

  // Las páginas privadas nunca cargan medición ni publicidad.
  var isPrivate = /(admin|mi-area|acceso|reservar|calcula)\.html$/.test(location.pathname);

  function apply() {
    if (!state) return;
    gtag("consent", "update", {
      analytics_storage: state.analytics ? "granted" : "denied",
      ad_storage: state.marketing ? "granted" : "denied",
      ad_user_data: state.marketing ? "granted" : "denied",
      ad_personalization: state.marketing ? "granted" : "denied"
    });
    if (!isPrivate && state.analytics && ids.ga4 && !loaded.ga4) {
      loaded.ga4 = true; gtag("js", new Date()); gtag("config", ids.ga4);
      script("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ids.ga4));
    }
    if (!isPrivate && state.marketing && ids.metaPixel && !loaded.meta) {
      loaded.meta = true;
      var f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
      f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
      f("init", ids.metaPixel); f("track", "PageView");
      script("https://connect.facebook.net/en_US/fbevents.js");
    }
    listeners.forEach(function (fn) { fn(state); });
  }

  function save(analytics, marketing) {
    var withdrew = state && ((state.analytics && !analytics) || (state.marketing && !marketing));
    state = { v: cc.version || 1, ts: Date.now(), analytics: !!analytics, marketing: !!marketing };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    close(); apply();
    if (withdrew && (loaded.ga4 || loaded.meta)) location.reload(); // para descargar lo ya cargado
  }

  var box = null;
  function close() { if (box) { box.remove(); box = null; } }

  function open(settings) {
    close();
    box = document.createElement("div");
    box.className = "ck"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "false"); box.setAttribute("aria-labelledby", "ck-t");
    var intro = '<h2 id="ck-t">Tu privacidad</h2><p>Usamos almacenamiento necesario para que la web funcione. Con tu permiso, podremos medir las visitas y mostrar publicidad. Hoy puedes elegir y cambiarlo cuando quieras. <a href="' + root + 'cookies.html">Política de cookies</a>.</p>';
    var opts = settings ? '<div class="ck-opts">' +
      '<label class="ck-opt"><input type="checkbox" checked disabled><span><b>Necesarias</b><span>Recordar tu elección y mantener tu sesión. Siempre activas.</span></span></label>' +
      '<label class="ck-opt"><input type="checkbox" id="ck-a"' + (state && state.analytics ? " checked" : "") + '><span><b>Medición</b><span>Saber qué páginas se visitan para mejorar la web.</span></span></label>' +
      '<label class="ck-opt"><input type="checkbox" id="ck-m"' + (state && state.marketing ? " checked" : "") + '><span><b>Publicidad</b><span>Medir campañas y mostrar anuncios en otras plataformas.</span></span></label></div>' : "";
    box.innerHTML = intro + opts + '<div class="ck-actions">' +
      '<button type="button" class="btn dark" data-ck="no">Rechazar</button>' +
      '<button type="button" class="btn dark" data-ck="yes">Aceptar</button>' +
      (settings ? '<button type="button" class="btn" data-ck="save">Guardar elección</button>' : '<button type="button" class="btn" data-ck="more">Configurar</button>') + "</div>";
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ck]"); if (!b) return;
      var a = b.getAttribute("data-ck");
      if (a === "no") save(false, false);
      else if (a === "yes") save(true, true);
      else if (a === "more") open(true);
      else save(box.querySelector("#ck-a").checked, box.querySelector("#ck-m").checked);
    });
    document.body.appendChild(box);
  }

  window.LustroConsent = {
    get: function () { return state; },
    open: function () { open(true); },
    onChange: function (fn) { listeners.push(fn); if (state) fn(state); }
  };

  document.addEventListener("click", function (e) { if (e.target.closest("[data-cookies]") && !cc.externalScript) open(true); });

  if (cc.externalScript) script(cc.externalScript);
  else if (state) apply();
  else open(false);
})();
