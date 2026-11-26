/* Capa de datos. Dos modos con la misma interfaz:
     demo      → todo en este navegador (localStorage). Sirve para probar; NO es seguro ni compartido.
     supabase  → base de datos real (ver store-supabase.js y supabase/).
   Uso: LustroStore.ready().then(function (db) { ... }) */
(function (global) {
  "use strict";
  var isNode = typeof module !== "undefined" && module.exports;
  var C = isNode ? require("./core.js") : global.LustroCore;

  function createDemo(cfg, areas, env) {
    var storage = env.storage, cryptoObj = env.crypto, clock = env.clock || function () { return new Date(); };
    var KEY = "lustro_db_v1", SKEY = "lustro_session", HOURS8 = 8 * 3600e3;

    function load() {
      var raw = storage.getItem(KEY);
      if (!raw) return { users: [], bookings: [], blocks: [] };
      return JSON.parse(raw);
    }
    function save(db) { storage.setItem(KEY, JSON.stringify(db)); }
    function now() { return clock().toISOString(); }
    function nowM() { return C.nowMadrid(clock()); }
    function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
    function random(n) { var a = new Uint8Array(n); cryptoObj.getRandomValues(a); return a; }
    function uid() { return hex(random(12)); }
    function code() { var A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; return Array.from(random(6), function (b) { return A[b % A.length]; }).join(""); }
    function tempPassword() { var A = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"; return Array.from(random(12), function (b) { return A[b % A.length]; }).join(""); }
    function hash(password, salt) {
      var enc = new TextEncoder();
      return cryptoObj.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]).then(function (k) {
        return cryptoObj.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 150000 }, k, 256);
      }).then(hex);
    }
    function pub(u) { return u && { id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone, active: u.active, mustChange: u.mustChange, createdAt: u.createdAt }; }
    function current(db) {
      var s; try { s = JSON.parse(storage.getItem(SKEY)); } catch (e) { return null; }
      if (!s || s.exp < clock().getTime()) return null;
      return db.users.filter(function (u) { return u.id === s.userId && u.active; })[0] || null;
    }
    function requireUser(db) { var u = current(db); if (!u) throw new Error("Tu sesión ha caducado. Vuelve a entrar."); return u; }
    function requireAdmin(db) { var u = requireUser(db); if (u.role !== "admin") throw new Error("No tienes permiso para hacer esto."); return u; }
    function session(u) { storage.setItem(SKEY, JSON.stringify({ userId: u.id, exp: clock().getTime() + HOURS8 })); }
    function checkPassword(p) { if (String(p || "").length < 10) throw new Error("La contraseña debe tener al menos 10 caracteres."); }
    function checkPerson(d) {
      if (!C.validName(d.name)) throw new Error("Escribe el nombre completo.");
      if (!C.validEmail(d.email)) throw new Error("Revisa el correo electrónico.");
      if (d.phone && !C.validPhone(d.phone)) throw new Error("Revisa el teléfono.");
    }
    function findEmail(db, email) { return db.users.filter(function (u) { return u.email === C.cleanEmail(email); })[0]; }
    function find(list, id, what) { var x = list.filter(function (i) { return i.id === id; })[0]; if (!x) throw new Error(what + " no encontrada."); return x; }
    function activeBookings(db) { return db.bookings.filter(function (b) { return b.status !== "cancelada"; }); }
    function areaOk(id) { return areas.some(function (a) { return a.id === id; }); }
    function assertSlot(db, date, time, area, ignoreId, isAdmin) {
      var free = C.availableSlots(date, area, activeBookings(db), db.blocks, cfg, { now: nowM(), ignoreId: ignoreId, anyTime: isAdmin });
      if (free.indexOf(time) < 0) throw new Error("Esa hora ya no está disponible. Elige otra.");
    }
    function view(b, user) {
      var c = Object.assign({}, b);
      if (!user || user.role !== "admin") delete c.adminNotes;
      return c;
    }
    function async_(fn) { return function () { var a = arguments; return new Promise(function (res) { res(fn.apply(null, a)); }); }; }

    function newUser(db, d, role, password, mustChange) {
      checkPerson(d);
      if (findEmail(db, d.email)) throw new Error("Ya existe una cuenta con ese correo.");
      var salt = hex(random(16));
      return hash(password, salt).then(function (h) {
        var fresh = load();
        if (findEmail(fresh, d.email)) throw new Error("Ya existe una cuenta con ese correo.");
        var u = { id: uid(), role: role, name: d.name.trim(), email: C.cleanEmail(d.email), phone: (d.phone || "").trim(), active: true, mustChange: mustChange, salt: salt, hash: h, createdAt: now() };
        fresh.users.push(u);
        // enlaza las citas que ya hubiera con ese correo
        if (role === "paciente") fresh.bookings.forEach(function (b) { if (!b.patientId && b.email === u.email) b.patientId = u.id; });
        save(fresh);
        return u;
      });
    }

    var api = {
      mode: "demo",
      needsSetup: async_(function () { return !load().users.some(function (u) { return u.role === "admin"; }); }),
      setupAdmin: async_(function (d) {
        var db = load();
        if (db.users.some(function (u) { return u.role === "admin"; })) throw new Error("Ya hay una cuenta de administración.");
        checkPassword(d.password);
        return newUser(db, d, "admin", d.password, false).then(function (u) { session(u); return pub(u); });
      }),
      signIn: async_(function (email, password) {
        var db = load(), u = findEmail(db, email), bad = "Correo o contraseña incorrectos.";
        if (u && u.lockedUntil > clock().getTime()) throw new Error("Demasiados intentos. Espera unos minutos.");
        return hash(String(password || ""), u ? u.salt : "x").then(function (h) {
          var fresh = load(), x = u && findEmail(fresh, email);
          if (!x || !x.active || x.hash !== h) {
            if (x) { x.fails = (x.fails || 0) + 1; if (x.fails >= 5) { x.lockedUntil = clock().getTime() + 5 * 60e3; x.fails = 0; } save(fresh); }
            throw new Error(bad);
          }
          x.fails = 0; x.lockedUntil = 0; save(fresh); session(x); return pub(x);
        });
      }),
      signOut: async_(function () { storage.removeItem(SKEY); }),
      me: async_(function () { return pub(current(load())) || null; }),
      changePassword: async_(function (oldPassword, newPassword) {
        var db = load(), u = requireUser(db); checkPassword(newPassword);
        if (oldPassword === newPassword) throw new Error("La contraseña nueva debe ser distinta.");
        return hash(String(oldPassword || ""), u.salt).then(function (h) {
          if (h !== u.hash) throw new Error("La contraseña actual no es correcta.");
          var salt = hex(random(16));
          return hash(newPassword, salt).then(function (nh) {
            var fresh = load(), x = find(fresh.users, u.id, "Cuenta"); x.salt = salt; x.hash = nh; x.mustChange = false; save(fresh); return pub(x);
          });
        });
      }),
      updateProfile: async_(function (d) {
        var db = load(), u = requireUser(db);
        checkPerson({ name: d.name, email: u.email, phone: d.phone });
        u.name = d.name.trim(); u.phone = (d.phone || "").trim(); save(db); return pub(u);
      }),

      listUsers: async_(function () { var db = load(); requireAdmin(db); return db.users.map(pub); }),
      createUser: async_(function (d) {
        var db = load(); requireAdmin(db);
        var role = d.role === "admin" ? "admin" : "paciente", temp = tempPassword();
        return newUser(db, d, role, temp, true).then(function (u) { return { user: pub(u), tempPassword: temp }; });
      }),
      updateUser: async_(function (id, patch) {
        var db = load(), me = requireAdmin(db), u = find(db.users, id, "Cuenta");
        if (patch.active === false && u.id === me.id) throw new Error("No puedes desactivar tu propia cuenta.");
        var next = Object.assign({}, u, patch);
        checkPerson(next);
        var other = findEmail(db, next.email); if (other && other.id !== id) throw new Error("Ya existe una cuenta con ese correo.");
        ["name", "phone"].forEach(function (k) { if (patch[k] !== undefined) u[k] = String(patch[k]).trim(); });
        if (patch.email !== undefined) u.email = C.cleanEmail(patch.email);
        if (patch.active !== undefined) u.active = !!patch.active;
        save(db); return pub(u);
      }),
      resetPassword: async_(function (id) {
        var db = load(); requireAdmin(db); find(db.users, id, "Cuenta");
        var temp = tempPassword(), salt = hex(random(16));
        return hash(temp, salt).then(function (h) {
          var fresh = load(), u = find(fresh.users, id, "Cuenta"); u.salt = salt; u.hash = h; u.mustChange = true; u.lockedUntil = 0; save(fresh);
          return { user: pub(u), tempPassword: temp };
        });
      }),
      /* Borra la cuenta. Sus citas se conservan sin vínculo (historial de la clínica). */
      deleteUser: async_(function (id) {
        var db = load(), me = requireAdmin(db); if (id === me.id) throw new Error("No puedes borrar tu propia cuenta.");
        find(db.users, id, "Cuenta");
        db.users = db.users.filter(function (u) { return u.id !== id; });
        db.bookings.forEach(function (b) { if (b.patientId === id) b.patientId = null; });
        save(db);
      }),

      busy: async_(function (date) {
        return activeBookings(load()).filter(function (b) { return b.date === date; }).map(function (b) { return { id: undefined, date: b.date, time: b.time, area: b.area, duration: b.duration }; });
      }),
      /* Disponibilidad lista para pintar; ignoreId sirve para reprogramar. */
      freeSlots: async_(function (date, area, ignoreId) {
        var db = load(), u = current(db);
        return C.availableSlots(date, area, activeBookings(db), db.blocks, cfg, { now: nowM(), ignoreId: ignoreId, anyTime: !!(u && u.role === "admin") });
      }),
      listBookings: async_(function () {
        var db = load(), u = requireUser(db);
        return db.bookings.filter(function (b) { return u.role === "admin" || b.patientId === u.id; })
          .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }).map(function (b) { return view(b, u); });
      }),
      createBooking: async_(function (d) {
        var db = load(), u = current(db), isAdmin = !!(u && u.role === "admin");
        if (!C.validName(d.name)) throw new Error("Escribe el nombre completo.");
        if (!C.validPhone(d.phone)) throw new Error("Revisa el teléfono.");
        if (d.email ? !C.validEmail(d.email) : !isAdmin) throw new Error("Revisa el correo electrónico.");
        if (!areaOk(d.area)) throw new Error("Elige un área.");
        if (!isAdmin && !d.consent) throw new Error("Debes aceptar la política de privacidad.");
        if (String(d.notes || "").length > 500) throw new Error("El comentario es demasiado largo.");
        assertSlot(db, d.date, d.time, d.area, null, isAdmin);
        var email = C.cleanEmail(d.email), patientId = null;
        if (u && u.role === "paciente") { patientId = u.id; email = u.email; }
        else if (isAdmin && d.patientId) patientId = d.patientId;
        else { var m = email && findEmail(db, email); if (m && m.role === "paciente") patientId = m.id; }
        if (!isAdmin) {
          var digits = C.waNumber(d.phone), today = nowM().date;
          var pending = db.bookings.filter(function (b) { return b.status === "pendiente" && b.date >= today && (b.email === email || C.waNumber(b.phone) === digits); }).length;
          if (pending >= cfg.booking.maxPendingPerContact) throw new Error("Ya tienes varias solicitudes pendientes. Llámanos y te ayudamos.");
        }
        var b = { id: uid(), code: code(), patientId: patientId, name: d.name.trim(), email: email, phone: d.phone.trim(), area: d.area, date: d.date, time: d.time,
          duration: cfg.booking.slotMinutes, status: isAdmin ? (d.status || "confirmada") : "pendiente", source: isAdmin ? "clinica" : (u ? "paciente" : "web"),
          professional: isAdmin ? (d.professional || "") : "", notes: String(d.notes || "").trim(), adminNotes: isAdmin ? (d.adminNotes || "") : "",
          consentAt: d.consent ? now() : null, createdAt: now(), updatedAt: now() };
        db.bookings.push(b); save(db); return view(b, u);
      }),
      updateBooking: async_(function (id, patch) {
        var db = load(); requireAdmin(db);
        var b = find(db.bookings, id, "Cita"), next = Object.assign({}, b, patch);
        if (!C.STATUS[next.status]) throw new Error("Estado no válido.");
        if (!areaOk(next.area)) throw new Error("Elige un área.");
        var moved = next.date !== b.date || next.time !== b.time || next.area !== b.area || (b.status === "cancelada" && next.status !== "cancelada");
        if (moved && next.status !== "cancelada") assertSlot(db, next.date, next.time, next.area, id, true);
        ["patientId", "name", "email", "phone", "area", "date", "time", "status", "professional", "adminNotes"].forEach(function (k) { if (patch[k] !== undefined) b[k] = patch[k]; });
        b.email = C.cleanEmail(b.email); b.updatedAt = now(); save(db); return view(b, { role: "admin" });
      }),
      cancelBooking: async_(function (id) {
        var db = load(), u = requireUser(db), b = find(db.bookings, id, "Cita");
        if (u.role !== "admin" && b.patientId !== u.id) throw new Error("No tienes permiso para hacer esto.");
        if (!C.isUpcoming(b, nowM())) throw new Error("Esta cita ya no se puede cancelar.");
        b.status = "cancelada"; b.updatedAt = now(); save(db); return view(b, u);
      }),
      rescheduleBooking: async_(function (id, date, time) {
        var db = load(), u = requireUser(db), b = find(db.bookings, id, "Cita"), isAdmin = u.role === "admin";
        if (!isAdmin && b.patientId !== u.id) throw new Error("No tienes permiso para hacer esto.");
        if (!C.isUpcoming(b, nowM())) throw new Error("Esta cita ya no se puede cambiar.");
        assertSlot(db, date, time, b.area, id, isAdmin);
        b.date = date; b.time = time; if (!isAdmin) b.status = "pendiente"; b.updatedAt = now(); save(db); return view(b, u);
      }),
      deleteBooking: async_(function (id) { var db = load(); requireAdmin(db); find(db.bookings, id, "Cita"); db.bookings = db.bookings.filter(function (b) { return b.id !== id; }); save(db); }),

      listBlocks: async_(function () { var db = load(); requireAdmin(db); return db.blocks.slice().sort(function (a, b) { return (a.date + a.from).localeCompare(b.date + b.from); }); }),
      addBlock: async_(function (d) {
        var db = load(); requireAdmin(db);
        if (!C.isDate(d.date)) throw new Error("Elige el día.");
        if (!!d.from !== !!d.to || (d.from && C.toMin(d.from) >= C.toMin(d.to))) throw new Error("Revisa las horas: indica inicio y fin, o ninguna para todo el día.");
        var dates = [], end = d.until || d.date;
        if (!C.isDate(end) || end < d.date || C.daysBetween(d.date, end) > 92) throw new Error("Revisa la fecha final (máximo tres meses).");
        for (var x = d.date; x <= end; x = C.addDays(x, 1)) dates.push(x);
        dates.forEach(function (day) { db.blocks.push({ id: uid(), date: day, from: d.from || "", to: d.to || "", reason: (d.reason || "").trim() }); });
        save(db); return dates.length;
      }),
      removeBlock: async_(function (id) { var db = load(); requireAdmin(db); db.blocks = db.blocks.filter(function (b) { return b.id !== id; }); save(db); }),

      exportAll: async_(function () { var db = load(); requireAdmin(db); return { exportedAt: now(), users: db.users.map(pub), bookings: db.bookings, blocks: db.blocks }; }),
      wipe: async_(function () { var db = load(); requireAdmin(db); storage.removeItem(KEY); storage.removeItem(SKEY); }),
      /* Datos ficticios para enseñar el panel. */
      seedDemo: async_(function () {
        var db = load(); requireAdmin(db);
        if (db.bookings.some(function (b) { return b.source === "ejemplo"; })) throw new Error("Los datos de ejemplo ya están cargados.");
        var people = ["Ana Ejemplo", "Bruno Ejemplo", "Carla Ejemplo", "Diego Ejemplo"], chain = Promise.resolve();
        people.forEach(function (name, k) {
          chain = chain.then(function () {
            var email = name.split(" ")[0].toLowerCase() + "@ejemplo.test";
            if (findEmail(load(), email)) return;
            return newUser(load(), { name: name, email: email, phone: "60000000" + (k + 1) }, "paciente", tempPassword(), true);
          });
        });
        return chain.then(function () {
          var d = load(), today = nowM().date, made = 0;
          for (var off = -4; off <= 16 && made < 22; off++) {
            var day = C.addDays(today, off), slots = C.slotsFor(day, cfg);
            if (!slots.length) continue;
            for (var j = 0; j < 2 && made < 22; j++) {
              var area = areas[(made * 3 + j) % areas.length].id, time = slots[(made * 5 + j * 3) % slots.length];
              var p = findEmail(d, people[made % 4].split(" ")[0].toLowerCase() + "@ejemplo.test");
              if (C.availableSlots(day, area, activeBookings(d), d.blocks, cfg, { now: nowM(), anyTime: true }).indexOf(time) < 0) continue;
              d.bookings.push({ id: uid(), code: code(), patientId: p.id, name: p.name, email: p.email, phone: p.phone, area: area, date: day, time: time, duration: cfg.booking.slotMinutes,
                status: off < 0 ? (made % 5 === 0 ? "no_asistio" : "realizada") : (made % 3 === 0 ? "pendiente" : "confirmada"), source: "ejemplo", professional: "", notes: made % 4 === 0 ? "Prefiero que me confirmen por teléfono." : "",
                adminNotes: "", consentAt: now(), createdAt: now(), updatedAt: now() });
              made++;
            }
          }
          save(d); return made;
        });
      })
    };
    return api;
  }

  if (isNode) { module.exports = { createDemo: createDemo }; return; }

  var promise = null;
  global.LustroStore = {
    createDemo: createDemo,
    ready: function () {
      if (promise) return promise;
      var cfg = global.LUSTRO_CONFIG, backend = cfg.backend || {};
      if (backend.provider === "supabase") {
        promise = new Promise(function (res, rej) {
          var s = document.createElement("script"); s.src = (document.body.getAttribute("data-root") || "") + "assets/js/store-supabase.js";
          s.onload = function () { global.LustroSupabase.create(cfg, global.LUSTRO_AREAS).then(res, rej); };
          s.onerror = function () { rej(new Error("No se pudo cargar la conexión con la base de datos.")); };
          document.head.appendChild(s);
        });
      } else {
        promise = new Promise(function (res) {
          if (!global.crypto || !global.crypto.subtle) throw new Error("Abre la web con https (o en localhost) para usar el área privada.");
          global.localStorage.setItem("lustro_probe", "1"); global.localStorage.removeItem("lustro_probe");
          res(createDemo(cfg, global.LUSTRO_AREAS, { storage: global.localStorage, crypto: global.crypto }));
        });
      }
      return promise;
    }
  };
})(this);
