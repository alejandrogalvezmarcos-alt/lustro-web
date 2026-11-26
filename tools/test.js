/* Pruebas de la lógica:  node tools/test.js */
"use strict";
const assert = require("assert");
const { webcrypto } = require("crypto");
global.window = global;
require("../assets/js/config.js");
require("../assets/js/areas.js");
const C = require("../assets/js/core.js");
const S = require("../assets/js/score.js");
const { createDemo } = require("../assets/js/store.js");
const cfg = global.LUSTRO_CONFIG, areas = global.LUSTRO_AREAS;

let passed = 0;
async function t(name, fn) { try { await fn(); passed++; } catch (e) { console.error("FALLA:", name, "\n ", e.message); process.exitCode = 1; } }
const rejects = (p, re) => assert.rejects(p, re);

const NOW = new Date("2026-11-30T07:00:00Z"); // lunes 08:00 en Madrid
const MON = "2026-12-07", TUE = "2026-12-01", SAT = "2026-12-05", HOL = "2026-12-08";

function memory() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; }
function make(clock) { const storage = memory(); return { storage, db: createDemo(cfg, areas, { storage, crypto: webcrypto, clock: clock || (() => NOW) }) }; }
const PW = "clave-de-prueba-" + Math.random().toString(36).slice(2);
const booking = (o) => Object.assign({ name: "Persona Prueba", phone: "600111222", email: "persona@ejemplo.test", area: "nutricion", date: TUE, time: "10:00", consent: true }, o);

(async () => {
  await t("horario por día", () => {
    assert.strictEqual(C.slotsFor(MON, cfg).length, 19);
    assert.strictEqual(C.slotsFor(TUE, cfg).length, 16);
    assert.ok(!C.slotsFor(TUE, cfg).includes("14:00"));
    assert.ok(C.slotsFor(TUE, cfg).includes("19:30"));
    assert.deepStrictEqual(C.slotsFor(SAT, cfg), []);
    assert.deepStrictEqual(C.slotsFor(HOL, cfg), []);
  });
  await t("hora de Madrid", () => {
    assert.deepStrictEqual(C.nowMadrid(NOW), { date: "2026-11-30", minutes: 480 });
    assert.strictEqual(C.nowMadrid(new Date("2026-07-01T22:30:00Z")).date, "2026-07-02");
  });
  await t("disponibilidad: ocupadas, bloqueos, antelación y horizonte", () => {
    const now = { date: "2026-11-30", minutes: 600 };
    const free = C.availableSlots(TUE, "nutricion", [{ date: TUE, time: "10:00", area: "nutricion", duration: 30 }], [{ date: TUE, from: "16:00", to: "17:00" }], cfg, { now });
    assert.ok(!free.includes("10:00") && !free.includes("16:00") && !free.includes("16:30") && free.includes("17:00"));
    assert.ok(C.availableSlots(TUE, "estetica", [{ date: TUE, time: "10:00", area: "nutricion" }], [], cfg, { now }).includes("10:00"));
    assert.strictEqual(C.availableSlots("2026-11-30", "nutricion", [], [], cfg, { now })[0], "12:00");
    assert.deepStrictEqual(C.availableSlots("2026-11-27", "nutricion", [], [], cfg, { now }), []);
    assert.deepStrictEqual(C.availableSlots("2027-06-01", "nutricion", [], [], cfg, { now }), []);
    assert.deepStrictEqual(C.availableSlots("2026-13-40", "nutricion", [], [], cfg, { now }), []);
  });
  await t("validaciones y exportación segura", () => {
    assert.ok(C.validPhone("+34 613 767 627") && !C.validPhone("12345") && !C.validPhone("600abc111"));
    assert.ok(C.validEmail(" A@B.es ") && !C.validEmail("a@b"));
    assert.strictEqual(C.waNumber("613 767 627"), "34613767627");
    assert.strictEqual(C.esc('<img src=x onerror="a">'), "&lt;img src=x onerror=&quot;a&quot;&gt;");
    assert.strictEqual(C.csv([["=1+1", 'a"b']]), '"\'=1+1";"a""b"');
  });

  const { db, storage } = make();
  let patient, temp, other;
  await t("alta de administración", async () => {
    assert.strictEqual(await db.needsSetup(), true);
    await rejects(db.setupAdmin({ name: "Admin", email: "admin@ejemplo.test", password: "corta" }), /10 caracteres/);
    const a = await db.setupAdmin({ name: "Admin Prueba", email: "admin@ejemplo.test", password: PW });
    assert.strictEqual(a.role, "admin");
    await rejects(db.setupAdmin({ name: "Otro", email: "o@ejemplo.test", password: PW }), /Ya hay/);
    assert.ok(!storage.getItem("lustro_db_v1").includes(PW), "la contraseña no se guarda en claro");
  });
  await t("alta de paciente y duplicados", async () => {
    const r = await db.createUser({ name: "Paciente Uno", email: "Uno@Ejemplo.test", phone: "600000001" });
    patient = r.user; temp = r.tempPassword;
    assert.strictEqual(patient.email, "uno@ejemplo.test"); assert.ok(temp.length >= 10 && patient.mustChange);
    await rejects(db.createUser({ name: "Repetido", email: "uno@ejemplo.test" }), /Ya existe/);
    other = (await db.createUser({ name: "Paciente Dos", email: "dos@ejemplo.test", phone: "600000002" })).user;
    assert.ok(!("hash" in patient) && !("salt" in patient));
  });
  let anon, foreign;
  await t("reserva anónima, enlace por correo y doble reserva", async () => {
    await db.signOut();
    anon = await db.createBooking(booking({ email: "uno@ejemplo.test" }));
    assert.strictEqual(anon.status, "pendiente"); assert.strictEqual(anon.patientId, patient.id); assert.ok(!("adminNotes" in anon));
    await rejects(db.createBooking(booking({ email: "x@ejemplo.test", phone: "600999888" })), /no está disponible/);
    await rejects(db.createBooking(booking({ date: SAT })), /no está disponible/);
    await rejects(db.createBooking(booking({ time: "10:30", consent: false })), /privacidad/);
    await rejects(db.createBooking(booking({ time: "10:30", area: "inventada" })), /área/);
    foreign = await db.createBooking(booking({ email: "dos@ejemplo.test", phone: "600000002", time: "11:00", status: "confirmada", adminNotes: "colado" }));
    assert.strictEqual(foreign.status, "pendiente", "el público no puede autoconfirmarse");
  });
  await t("límite de solicitudes pendientes", async () => {
    for (const time of ["12:00", "12:30"]) await db.createBooking(booking({ email: "uno@ejemplo.test", time }));
    await rejects(db.createBooking(booking({ email: "uno@ejemplo.test", time: "13:00" })), /pendientes/);
  });
  await t("sin sesión no se ve nada", async () => {
    await rejects(db.listBookings(), /sesión/); await rejects(db.listUsers(), /sesión/); await rejects(db.exportAll(), /sesión/);
    await rejects(db.cancelBooking(anon.id), /sesión/);
  });
  await t("permisos del paciente", async () => {
    await rejects(db.signIn("uno@ejemplo.test", "mala"), /incorrectos/);
    await db.signIn("uno@ejemplo.test", temp);
    const mine = await db.listBookings();
    assert.ok(mine.length === 3 && mine.every(b => b.patientId === patient.id));
    await rejects(db.listUsers(), /permiso/); await rejects(db.createUser({ name: "Xx", email: "x@y.es" }), /permiso/);
    await rejects(db.updateBooking(anon.id, { status: "confirmada" }), /permiso/);
    await rejects(db.cancelBooking(foreign.id), /permiso/);
    await rejects(db.rescheduleBooking(foreign.id, TUE, "17:00"), /permiso/);
    await rejects(db.addBlock({ date: TUE }), /permiso/);
    await rejects(db.changePassword("mala", "otra-clave-larga"), /actual/);
    const u = await db.changePassword(temp, PW + "-p"); assert.strictEqual(u.mustChange, false);
    const moved = await db.rescheduleBooking(anon.id, TUE, "17:00"); assert.strictEqual(moved.time, "17:00");
    await rejects(db.rescheduleBooking(anon.id, TUE, "11:00").then(() => db.rescheduleBooking(anon.id, SAT, "11:00")), /disponible/);
    assert.strictEqual((await db.cancelBooking(anon.id)).status, "cancelada");
    await rejects(db.cancelBooking(anon.id), /ya no/);
  });
  await t("administración: citas, bloqueos y notas internas", async () => {
    await db.signOut(); await db.signIn("admin@ejemplo.test", PW);
    const b = await db.updateBooking(foreign.id, { status: "confirmada", adminNotes: "nota", professional: "Juan" });
    assert.strictEqual(b.status, "confirmada");
    await rejects(db.createBooking(booking({ time: "11:00" })), /disponible/);
    await rejects(db.updateBooking(foreign.id, { status: "rara" }), /Estado/);
    assert.strictEqual(await db.addBlock({ date: MON, until: "2026-12-09", reason: "puente" }), 3);
    assert.deepStrictEqual(await db.freeSlots(MON, "nutricion"), []);
    await rejects(db.addBlock({ date: TUE, from: "12:00" }), /horas/);
    const walk = await db.createBooking({ name: "Sin Correo", phone: "600333444", area: "nutricion", date: TUE, time: "18:00" });
    assert.strictEqual(walk.status, "confirmada"); assert.strictEqual(walk.patientId, null);
  });
  await t("el paciente no ve la nota interna", async () => {
    const r = await db.resetPassword(other.id);
    await db.signOut(); await db.signIn("dos@ejemplo.test", r.tempPassword);
    const l = await db.listBookings(); assert.strictEqual(l.length, 1); assert.ok(!("adminNotes" in l[0]));
  });
  await t("desactivar, bloquear por intentos y borrar", async () => {
    await db.signOut(); const admin = await db.signIn("admin@ejemplo.test", PW);
    await rejects(db.updateUser(admin.id, { active: false }), /propia/);
    await db.updateUser(patient.id, { active: false });
    await db.signOut(); await rejects(db.signIn("uno@ejemplo.test", PW + "-p"), /incorrectos/);
    for (let i = 0; i < 4; i++) await rejects(db.signIn("dos@ejemplo.test", "no"), /incorrectos/);
    for (let i = 0; i < 2; i++) await rejects(db.signIn("dos@ejemplo.test", "no"), /incorrectos|Demasiados/);
    await rejects(db.signIn("dos@ejemplo.test", "no"), /Demasiados/);
    await db.signIn("admin@ejemplo.test", PW);
    await db.deleteUser(patient.id);
    assert.ok((await db.listBookings()).every(b => b.patientId !== patient.id));
  });
  await t("la sesión caduca", async () => {
    let now = NOW; const s = make(() => now);
    await s.db.setupAdmin({ name: "Admin", email: "a@ejemplo.test", password: PW });
    now = new Date(NOW.getTime() + 9 * 3600e3);
    assert.strictEqual(await s.db.me(), null);
  });
  await t("datos de ejemplo", async () => {
    const s = make(); await s.db.setupAdmin({ name: "Admin", email: "a@ejemplo.test", password: PW });
    const n = await s.db.seedDemo(); assert.ok(n >= 15, "citas creadas: " + n);
    const keys = (await s.db.listBookings()).map(b => b.date + b.time + b.area); assert.strictEqual(new Set(keys).size, keys.length);
    await rejects(s.db.seedDemo(), /ya están/);
  });

  const answers = (k) => { const a = { edad: "40", altura: "170", peso: "65", cintura: "75", moderada: "200", intensa: "0" }; S.STEPS.forEach(s => s.questions.forEach(q => { a[q.id] = k === "best" ? 0 : q.opts.reduce((w, o, i) => (o.pts < q.opts[w].pts ? i : w), 0); })); return a; };
  await t("calculadora: extremos", () => {
    const best = S.evaluate(answers("best")); assert.strictEqual(best.total, 100); assert.strictEqual(best.flags.length, 0);
    const bad = Object.assign(answers("worst"), { peso: "120", cintura: "130", moderada: "0" });
    const r = S.evaluate(bad); assert.ok(r.total < 25, "total " + r.total); assert.ok(r.areas.every(a => a.score >= 0 && a.score <= 100 && a.tips.length));
    assert.ok(r.flags.length >= 1);
  });
  await t("calculadora: medidas y opcionales", () => {
    assert.strictEqual(S.bmi(70, 175), 22.9); assert.strictEqual(S.whtr(80, 170), 0.47);
    assert.strictEqual(S.activityMinutes({ moderada: "30", intensa: "60" }), 150);
    const a = answers("best"); delete a.peso; delete a.cintura; const r = S.evaluate(a);
    assert.strictEqual(r.bmi, null); assert.strictEqual(r.total, 100);
    assert.ok(S.missing(S.STEPS[0], {}).length === 1 && S.missing(S.STEPS[0], { edad: "17" }).length === 1 && S.missing(S.STEPS[0], { edad: "30" }).length === 0);
    assert.strictEqual(S.evaluate({}).total, null);
  });

  console.log(passed + " pruebas correctas" + (process.exitCode ? " (con fallos)" : ""));
})();
