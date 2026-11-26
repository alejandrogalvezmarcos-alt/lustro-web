/* Misma interfaz que el modo demostración, contra Supabase (ver supabase/schema.sql).
   Estado: no probado todavía contra un proyecto real. */
(function (global) {
  "use strict";
  var SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
  var C = global.LustroCore;

  function create(cfg) {
    var b = cfg.backend;
    if (!b.supabaseUrl || !b.supabaseAnonKey) return Promise.reject(new Error("Falta la dirección o la clave pública de la base de datos en config.js."));
    return import(SDK).then(function (lib) {
      var sb = lib.createClient(b.supabaseUrl, b.supabaseAnonKey, { auth: { storageKey: "lustro_session" } });
      // Cliente sin sesión propia: invita a otras personas sin cerrar la sesión de quien administra.
      var inviter = lib.createClient(b.supabaseUrl, b.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "lustro_invite" } });
      var here = location.origin + location.pathname.replace(/[^/]*$/, "") + "acceso.html";

      function ok(r) {
        if (r.error) {
          if (r.error.code === "23505") throw new Error("Ya existe un registro con esos datos (correo u hora ocupada).");
          throw new Error(r.error.message);
        }
        return r.data;
      }
      function profile(p) { return p && { id: p.id, role: p.role, name: p.name, email: p.email, phone: p.phone, active: p.active, mustChange: false, createdAt: p.created_at }; }
      function booking(x) {
        var n = x.booking_notes, note = Array.isArray(n) ? n[0] && n[0].note : n && n.note;
        return { id: x.id, code: x.code, patientId: x.patient_id, name: x.name, email: x.email, phone: x.phone, area: x.area, date: x.date, time: String(x.time).slice(0, 5),
          duration: x.duration, status: x.status, source: x.source, professional: x.professional, notes: x.notes, adminNotes: note || "", createdAt: x.created_at };
      }
      function row(d) {
        var o = {};
        [["patientId", "patient_id"], ["name"], ["email"], ["phone"], ["area"], ["date"], ["time"], ["status"], ["professional"]].forEach(function (k) {
          if (d[k[0]] !== undefined) o[k[1] || k[0]] = d[k[0]];
        });
        return o;
      }
      function saveNote(id, note) { return note === undefined ? Promise.resolve() : sb.from("booking_notes").upsert({ booking_id: id, note: note }).then(ok); }
      function me() {
        return sb.auth.getUser().then(function (r) {
          var u = r.data && r.data.user; if (!u) return null;
          return sb.from("profiles").select("*").eq("auth_id", u.id).eq("active", true).maybeSingle().then(ok).then(profile);
        });
      }
      function invite(email) { return inviter.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true, emailRedirectTo: here } }).then(ok); }

      var api = {
        mode: "supabase",
        needsSetup: function () { return Promise.resolve(false); },
        setupAdmin: function () { return Promise.reject(new Error("La primera cuenta se crea desde la base de datos.")); },
        me: me,
        signIn: function (email, password) {
          return sb.auth.signInWithPassword({ email: C.cleanEmail(email), password: password }).then(function (r) {
            if (r.error) throw new Error("Correo o contraseña incorrectos.");
            return me().then(function (u) { if (!u) return sb.auth.signOut().then(function () { throw new Error("Esta cuenta no está activa."); }); return u; });
          });
        },
        sendMagicLink: function (email) {
          if (!C.validEmail(email)) return Promise.reject(new Error("Escribe tu correo."));
          return sb.auth.signInWithOtp({ email: C.cleanEmail(email), options: { shouldCreateUser: true, emailRedirectTo: here } }).then(ok);
        },
        signOut: function () { return sb.auth.signOut().then(ok); },
        changePassword: function (_old, nw) {
          if (String(nw || "").length < 10) return Promise.reject(new Error("La contraseña debe tener al menos 10 caracteres."));
          return sb.auth.updateUser({ password: nw }).then(ok).then(me);
        },
        updateProfile: function (d) { return me().then(function (u) { return sb.from("profiles").update({ name: d.name.trim(), phone: d.phone.trim() }).eq("id", u.id).then(ok).then(me); }); },

        listUsers: function () { return sb.from("profiles").select("*").order("name").then(ok).then(function (l) { return l.map(profile); }); },
        createUser: function (d) {
          if (!C.validName(d.name) || !C.validEmail(d.email)) return Promise.reject(new Error("Revisa el nombre y el correo."));
          return sb.from("profiles").insert({ name: d.name.trim(), email: C.cleanEmail(d.email), phone: (d.phone || "").trim(), role: d.role === "admin" ? "admin" : "paciente" })
            .select().single().then(ok).then(function (p) { return invite(p.email).then(function () { return { user: profile(p) }; }); });
        },
        updateUser: function (id, p) {
          var o = {}; ["name", "phone", "active"].forEach(function (k) { if (p[k] !== undefined) o[k] = p[k]; });
          return sb.from("profiles").update(o).eq("id", id).select().single().then(ok).then(profile);
        },
        resetPassword: function (id) { return sb.from("profiles").select("*").eq("id", id).single().then(ok).then(function (p) { return invite(p.email).then(function () { return { user: profile(p) }; }); }); },
        deleteUser: function (id) { return sb.from("profiles").delete().eq("id", id).then(ok); },

        freeSlots: function (date, area, ignoreId) {
          return me().then(function (u) {
            return sb.rpc("free_slots", { p_area: area, p_date: date, p_ignore: ignoreId || null }).then(ok).then(function (l) { return l.map(function (x) { return x.slot; }); })
              .then(function (slots) { return u && u.role === "admin" && !slots.length ? C.slotsFor(date, cfg) : slots; });
          });
        },
        listBookings: function () {
          return me().then(function (u) {
            if (!u) throw new Error("Tu sesión ha caducado. Vuelve a entrar.");
            var q = sb.from("bookings").select(u.role === "admin" ? "*, booking_notes(note)" : "*").order("date").order("time").limit(2000);
            if (u.role !== "admin") q = q.eq("patient_id", u.id);
            return q.then(ok).then(function (l) { return l.map(booking); });
          });
        },
        createBooking: function (d) {
          return me().then(function (u) {
            if (u && u.role === "admin") {
              return sb.from("bookings").insert(Object.assign(row(d), { source: "clinica", status: d.status || "confirmada", email: C.cleanEmail(d.email) })).select().single().then(ok)
                .then(function (x) { return saveNote(x.id, d.adminNotes).then(function () { return booking(x); }); });
            }
            return sb.rpc("create_booking", { p_name: d.name, p_email: d.email, p_phone: d.phone, p_area: d.area, p_date: d.date, p_time: d.time, p_notes: d.notes || "", p_consent: !!d.consent }).then(ok);
          });
        },
        updateBooking: function (id, p) {
          return sb.from("bookings").update(Object.assign(row(p), { updated_at: new Date().toISOString() })).eq("id", id).select().single().then(ok)
            .then(function (x) { return saveNote(id, p.adminNotes).then(function () { return booking(x); }); });
        },
        cancelBooking: function (id) { return sb.rpc("cancel_booking", { p_id: id }).then(ok); },
        rescheduleBooking: function (id, date, time) { return sb.rpc("reschedule_booking", { p_id: id, p_date: date, p_time: time }).then(ok); },
        deleteBooking: function (id) { return sb.from("bookings").delete().eq("id", id).then(ok); },

        listBlocks: function () { return sb.from("blocks").select("*").order("date").then(ok).then(function (l) { return l.map(function (x) { return { id: x.id, date: x.date, from: x.from_time ? x.from_time.slice(0, 5) : "", to: x.to_time ? x.to_time.slice(0, 5) : "", reason: x.reason }; }); }); },
        addBlock: function (d) {
          if (!C.isDate(d.date)) return Promise.reject(new Error("Elige el día."));
          var end = d.until || d.date, rows = [];
          if (end < d.date || C.daysBetween(d.date, end) > 92) return Promise.reject(new Error("Revisa la fecha final (máximo tres meses)."));
          for (var x = d.date; x <= end; x = C.addDays(x, 1)) rows.push({ date: x, from_time: d.from || null, to_time: d.to || null, reason: d.reason || "" });
          return sb.from("blocks").insert(rows).then(ok).then(function () { return rows.length; });
        },
        removeBlock: function (id) { return sb.from("blocks").delete().eq("id", id).then(ok); },
        exportAll: function () { return Promise.all([api.listUsers(), api.listBookings(), api.listBlocks()]).then(function (r) { return { exportedAt: new Date().toISOString(), users: r[0], bookings: r[1], blocks: r[2] }; }); }
      };
      return api;
    });
  }
  global.LustroSupabase = { create: create };
})(this);
