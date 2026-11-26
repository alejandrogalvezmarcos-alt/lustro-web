(function () {
  "use strict";
  var U = window.LustroUI, root = document.getElementById("app"), db;
  function go(u) { location.href = u.role === "admin" ? "admin.html" : "mi-area.html"; }

  window.LustroStore.ready().then(function (s) { db = s; return db.me(); }).then(function (u) {
    if (u) return go(u);
    root.innerHTML = U.demoRibbon(db) + '<div class="two"><form class="panel" id="login" novalidate><h2>Entrar</h2>' +
      U.field("Correo electrónico", "email", 'type="email" autocomplete="username" required') +
      U.field("Contraseña", "password", 'type="password" autocomplete="current-password" required') +
      '<p class="err" role="alert"></p><button class="btn dark" type="submit">Entrar</button>' +
      (db.mode === "supabase" ? '<p class="fine"><button type="button" class="link" id="magic">Recibir un enlace de acceso por correo</button></p>' : "") + "</form>" +
      '<div class="panel soft"><h2>¿Primera vez?</h2><p>La clínica te da de alta y te entrega tus datos de acceso. En tu área podrás:</p><ul class="ticks"><li>Ver tus próximas citas y tu historial</li><li>Cambiar o cancelar una cita</li><li>Reservar con tus datos ya rellenos</li><li>Descargar tus datos</li></ul>' +
      '<p class="fine">¿Olvidaste la contraseña? Escríbenos o llámanos y te damos una nueva.</p><p class="actions"><a class="btn" href="reservar.html">Reservar sin cuenta</a></p>' +
      (db.mode === "demo" ? '<p class="fine">Administración: <a class="link" href="admin.html">abrir el panel</a></p>' : "") + "</div></div>";
    var form = document.getElementById("login"), err = form.querySelector(".err");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = U.data(form), b = form.querySelector("[type=submit]"); b.disabled = true; err.textContent = "";
      db.signIn(d.email, d.password).then(go).catch(function (x) { b.disabled = false; err.textContent = x.message; });
    });
    var magic = document.getElementById("magic");
    if (magic) magic.addEventListener("click", function () {
      db.sendMagicLink(U.data(form).email).then(function () { U.toast("Si tienes cuenta, recibirás un correo con el enlace."); }).catch(function (x) { err.textContent = x.message; });
    });
  }).catch(function (e) { U.fail(root, e); });
})();
