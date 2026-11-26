/* Cálculo de "Calcula tu salud". Funciones puras: sin red, sin almacenamiento.
   Referencias para personas adultas: OMS (actividad física, fruta y verdura, IMC),
   guía europea de hipertensión 2024 (categorías de tensión), 7–9 h de sueño. */
(function (global) {
  "use strict";

  function o(label, pts) { return { label: label, pts: pts }; }

  // Cada pregunta: id, texto, opciones. `weight` = peso dentro de su ámbito.
  var STEPS = [
    { id: "perfil", title: "Para empezar", intro: "Datos básicos. Peso, estatura y cintura son opcionales.", numbers: [
        { id: "edad", label: "Edad (años)", min: 18, max: 100, required: true },
        { id: "altura", label: "Estatura (cm)", min: 120, max: 230 },
        { id: "peso", label: "Peso (kg)", min: 30, max: 250 },
        { id: "cintura", label: "Cintura (cm)", min: 45, max: 200, help: "A la altura del ombligo" } ],
      questions: [] },
    { id: "boca", title: "Boca", short: "Boca", area: "salud-oral", questions: [
        { id: "cepillado", q: "¿Cuántas veces al día te cepillas los dientes?", opts: [o("2 o más", 100), o("1", 50), o("No todos los días", 0)] },
        { id: "interdental", q: "¿Usas hilo o cepillos interdentales?", opts: [o("A diario", 100), o("Alguna vez por semana", 55), o("Casi nunca", 10)] },
        { id: "sangrado", q: "¿Te sangran las encías?", weight: 2, opts: [o("Nunca", 100), o("A veces", 45), o("Con frecuencia", 0)] },
        { id: "revision", q: "¿Cuándo fue tu última revisión dental?", opts: [o("Menos de 1 año", 100), o("Entre 1 y 2 años", 45), o("Más de 2 años", 0)] },
        { id: "senales", q: "¿Notas dolor, dientes que se mueven o aprietas la mandíbula?", opts: [o("No", 100), o("Alguna cosa, a ratos", 50), o("Sí, con frecuencia", 0)] } ] },
    { id: "corazon", title: "Corazón y metabolismo", short: "Corazón", area: "cardiologia", questions: [
        { id: "tabaco", q: "¿Fumas o vapeas?", weight: 2, opts: [o("Nunca he fumado", 100), o("Lo dejé", 80), o("De vez en cuando", 25), o("A diario", 0)] },
        { id: "tension", q: "Tu tensión arterial habitual", weight: 2, help: "Según medidas repetidas", opts: [o("Menos de 120/70", 100), o("Entre 120/70 y 139/89", 60), o("140/90 o más", 10), o("No lo sé", 40)] },
        { id: "analisis", q: "Colesterol y glucosa en tu última analítica", opts: [o("Normales, hace menos de 2 años", 100), o("Alguno alto", 35), o("Hace tiempo que no me analizo", 40)] },
        { id: "familia", q: "¿Algún familiar cercano tuvo un infarto o ictus antes de los 60?", opts: [o("No", 100), o("Sí", 35), o("No lo sé", 70)] } ] },
    { id: "nutricion", title: "Alimentación", short: "Nutrición", area: "nutricion", questions: [
        { id: "fruta", q: "Raciones de fruta y verdura al día", weight: 2, opts: [o("5 o más", 100), o("3 – 4", 65), o("1 – 2", 30), o("Casi ninguna", 0)] },
        { id: "legumbres", q: "¿Cuántas veces por semana comes legumbres?", opts: [o("3 o más", 100), o("1 – 2", 65), o("Casi nunca", 15)] },
        { id: "ultra", q: "Ultraprocesados, bollería o comida rápida", opts: [o("Rara vez", 100), o("Varias veces por semana", 45), o("A diario", 0)] },
        { id: "azucar", q: "Refrescos o bebidas azucaradas", opts: [o("Rara vez", 100), o("Varias veces por semana", 45), o("A diario", 0)] },
        { id: "alcohol", q: "Alcohol", help: "Cuanto menos, mejor para la salud", opts: [o("No bebo", 100), o("Ocasionalmente", 80), o("Varios días por semana", 35), o("A diario", 0)] } ] },
    { id: "movimiento", title: "Movimiento", short: "Movimiento", area: "fisioterapia", questions: [
        { id: "fuerza", q: "Días por semana con ejercicios de fuerza", opts: [o("2 o más", 100), o("1", 55), o("Ninguno", 0)] },
        { id: "sentado", q: "Horas al día sentado", opts: [o("Menos de 6", 100), o("De 6 a 9", 55), o("Más de 9", 15)] },
        { id: "dolor", q: "¿Algún dolor limita tu actividad?", opts: [o("No", 100), o("A veces", 55), o("Sí, a menudo", 10)] } ],
      numbers: [
        { id: "moderada", label: "Minutos/semana de actividad moderada", min: 0, max: 3000, required: true, help: "Caminar rápido, bici suave" },
        { id: "intensa", label: "Minutos/semana de actividad intensa", min: 0, max: 2000, required: true, help: "Correr, nadar fuerte" } ] },
    { id: "descanso", title: "Descanso y equilibrio", short: "Descanso", area: "longevidad", questions: [
        { id: "horas", q: "Horas de sueño por noche", weight: 2, opts: [o("7 – 9", 100), o("6 – 7", 60), o("Menos de 6", 15), o("Más de 9", 65)] },
        { id: "calidad", q: "¿Te levantas con sensación de haber descansado?", opts: [o("Casi siempre", 100), o("A veces", 55), o("Casi nunca", 10)] },
        { id: "estres", q: "En el último mes, ¿con qué frecuencia el estrés te ha superado?", opts: [o("Casi nunca", 100), o("A veces", 60), o("A menudo", 15)] },
        { id: "ronquido", q: "¿Roncas fuerte o te han visto dejar de respirar al dormir?", opts: [o("No", 100), o("No lo sé", 75), o("Sí", 20)] },
        { id: "energia", q: "Tu energía durante el día", opts: [o("Buena", 100), o("Irregular", 55), o("Baja casi siempre", 10)] } ] }
  ];

  var AREAS = STEPS.slice(1).map(function (s) { return { id: s.id, short: s.short, title: s.title, area: s.area }; });

  function bmi(kg, cm) { if (!kg || !cm) return null; var m = cm / 100; return Math.round((kg / (m * m)) * 10) / 10; }
  function bmiBand(v) {
    if (v == null) return null;
    if (v < 18.5) return { label: "Bajo peso", pts: 55 };
    if (v < 25) return { label: "Peso normal", pts: 100 };
    if (v < 30) return { label: "Sobrepeso", pts: 60 };
    return { label: "Obesidad", pts: 25 };
  }
  function whtr(waist, cm) { if (!waist || !cm) return null; return Math.round((waist / cm) * 100) / 100; }
  function whtrBand(v) {
    if (v == null) return null;
    if (v < 0.4) return { label: "Por debajo de lo habitual", pts: 70 };
    if (v < 0.5) return { label: "Dentro de la referencia", pts: 100 };
    if (v < 0.6) return { label: "Por encima de la referencia", pts: 50 };
    return { label: "Muy por encima de la referencia", pts: 15 };
  }
  function activityMinutes(a) { return (Number(a.moderada) || 0) + 2 * (Number(a.intensa) || 0); }
  function activityPts(min) { return Math.round(Math.min(1, min / 150) * 100); }

  function areaScore(stepId, a) {
    var step = STEPS.filter(function (s) { return s.id === stepId; })[0], sum = 0, w = 0;
    function add(pts, weight) { sum += pts * weight; w += weight; }
    step.questions.forEach(function (q) {
      var i = a[q.id];
      if (i === undefined || i === null || i === "") return;
      add(q.opts[i].pts, q.weight || 1);
    });
    if (stepId === "corazon") {
      var b = bmiBand(bmi(+a.peso, +a.altura)), c = whtrBand(whtr(+a.cintura, +a.altura));
      if (b) add(b.pts, 1);
      if (c) add(c.pts, 1);
    }
    if (stepId === "movimiento" && (a.moderada !== undefined && a.moderada !== "" || a.intensa !== undefined && a.intensa !== "")) add(activityPts(activityMinutes(a)), 3);
    return w ? Math.round(sum / w) : null;
  }

  function level(s) {
    if (s >= 80) return { id: "ok", label: "Buena base" };
    if (s >= 55) return { id: "mid", label: "Mejorable" };
    return { id: "low", label: "Prioridad" };
  }

  // Consejos en función de respuestas concretas: [condición, texto]
  var TIPS = {
    boca: [
      [function (a) { return a.sangrado > 0; }, "El sangrado de encías no es normal: pide una valoración."],
      [function (a) { return a.interdental > 0; }, "Incorpora a diario hilo o cepillos interdentales."],
      [function (a) { return a.cepillado > 0; }, "Cepíllate al menos dos veces al día con pasta fluorada."],
      [function (a) { return a.revision > 0; }, "Programa tu revisión: ha pasado más de un año."],
      [function (a) { return a.senales > 0; }, "El dolor, la movilidad dental o el bruxismo conviene explorarlos."] ],
    corazon: [
      [function (a) { return a.tabaco >= 2; }, "Dejar de fumar es el cambio con más impacto. Pide ayuda: funciona mejor con apoyo."],
      [function (a) { return a.tension === 2; }, "Una tensión de 140/90 o más debe confirmarse y valorarse por un médico."],
      [function (a) { return a.tension === 1; }, "Tu tensión está en rango elevado: vigílala y revisa sal, peso, actividad y alcohol."],
      [function (a) { return a.tension === 3; }, "Mídete la tensión: no suele dar síntomas."],
      [function (a) { return a.analisis > 0; }, "Una analítica reciente ayuda a saber dónde estás."],
      [function (a) { return a.familia === 1; }, "Con antecedentes familiares tempranos es razonable una valoración cardiológica."],
      [function (a) { var v = whtr(+a.cintura, +a.altura); return v != null && v >= 0.5; }, "Procura que tu cintura mida menos de la mitad de tu estatura."] ],
    nutricion: [
      [function (a) { return a.fruta > 0; }, "Suma una ración de verdura o fruta en cada comida hasta llegar a cinco."],
      [function (a) { return a.legumbres > 0; }, "Las legumbres tres o más veces por semana son una gran base."],
      [function (a) { return a.ultra > 0; }, "Reduce ultraprocesados: ten a mano alternativas sencillas."],
      [function (a) { return a.azucar > 0; }, "Cambia las bebidas azucaradas por agua."],
      [function (a) { return a.alcohol >= 2; }, "Reducir el alcohol mejora sueño, tensión y salud en general."] ],
    movimiento: [
      [function (a) { return activityMinutes(a) < 150; }, "Objetivo de la OMS: al menos 150 minutos moderados por semana. Empieza con 10 minutos al día más."],
      [function (a) { return a.fuerza > 0; }, "Añade fuerza dos días por semana."],
      [function (a) { return a.sentado > 0; }, "Levántate unos minutos cada hora."],
      [function (a) { return a.dolor > 0; }, "Un dolor que limita merece valoración de fisioterapia o médica."] ],
    descanso: [
      [function (a) { return a.horas === 1 || a.horas === 2; }, "Intenta acercarte a 7–9 horas con un horario regular."],
      [function (a) { return a.calidad > 0; }, "Cuida la rutina previa: luz baja, sin pantallas ni cenas copiosas."],
      [function (a) { return a.estres === 2; }, "Si el estrés te supera a menudo, habla con un profesional."],
      [function (a) { return a.ronquido === 2; }, "Ronquido intenso o pausas al respirar: conviene estudiar el sueño."],
      [function (a) { return a.energia === 2; }, "El cansancio persistente tiene muchas causas: consúltalo."] ]
  };
  var KEEP = { boca: "Mantén tus hábitos y la revisión periódica.", corazon: "Sigue así y controla tensión y analítica de vez en cuando.", nutricion: "Tu patrón es bueno: la constancia es la clave.", movimiento: "Cumples las referencias: varía y progresa poco a poco.", descanso: "Tu descanso es una fortaleza: protégelo." };

  function evaluate(a) {
    var areas = AREAS.map(function (ar) {
      var s = areaScore(ar.id, a);
      var tips = TIPS[ar.id].filter(function (t) { return t[0](a); }).map(function (t) { return t[1]; });
      return { id: ar.id, title: ar.title, short: ar.short, area: ar.area, score: s, level: s == null ? null : level(s), tips: tips.length ? tips : [KEEP[ar.id]] };
    });
    var done = areas.filter(function (x) { return x.score != null; });
    var total = done.length ? Math.round(done.reduce(function (t, x) { return t + x.score; }, 0) / done.length) : null;
    var ib = bmi(+a.peso, +a.altura), wh = whtr(+a.cintura, +a.altura), minutes = activityMinutes(a);
    var flags = [];
    if (a.tension === 2) flags.push("Has indicado tensión de 140/90 o más. Coméntalo con un médico. Con cifras de 180/110 o más, o con dolor en el pecho, falta de aire o alteraciones al hablar o moverte, llama al 112.");
    if (Number(a.edad) >= 65 && a.moderada !== undefined && minutes < 150) flags.push("A partir de los 65 años la OMS recomienda además trabajar el equilibrio. Adapta el ejercicio con un profesional.");
    var focus = done.slice().sort(function (x, y) { return x.score - y.score; })[0] || null;
    return { areas: areas, total: total, level: total == null ? null : level(total), bmi: ib, bmiBand: bmiBand(ib), whtr: wh, whtrBand: whtrBand(wh), minutes: minutes, flags: flags, focus: focus };
  }

  function missing(step, a) {
    var m = [];
    (step.numbers || []).forEach(function (n) {
      var v = a[n.id], empty = v === undefined || v === "";
      if (empty) { if (n.required) m.push("Completa: " + n.label); return; }
      if (isNaN(+v) || +v < n.min || +v > n.max) m.push(n.label + ": escribe un valor entre " + n.min + " y " + n.max);
    });
    if (step.questions.some(function (q) { return a[q.id] === undefined; })) m.push("Responde todas las preguntas de este paso.");
    return m;
  }

  var api = { STEPS: STEPS, AREAS: AREAS, bmi: bmi, bmiBand: bmiBand, whtr: whtr, whtrBand: whtrBand, activityMinutes: activityMinutes, areaScore: areaScore, evaluate: evaluate, level: level, missing: missing };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else global.LustroScore = api;
})(this);
