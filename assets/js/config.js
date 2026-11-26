/* Configuración de la web. Es el único archivo que hay que tocar para conectar servicios.
   Nunca pongas aquí claves secretas: todo lo de este archivo es público. */
window.LUSTRO_CONFIG = {
  clinic: { name: "Clínica Lustro", tel: "613 767 627", telHref: "+34613767627", wa: "34613767627", email: "info@clinicalustro.com" },

  /* Horario: 1 = lunes … 7 = domingo */
  hours: {
    1: [["10:00", "19:30"]],
    2: [["10:00", "14:00"], ["16:00", "20:00"]],
    3: [["10:00", "19:30"]],
    4: [["10:00", "14:00"], ["16:00", "20:00"]],
    5: [["10:00", "19:30"]]
  },
  holidays: ["2026-12-08", "2026-12-25", "2027-01-01", "2027-01-06"], // revisar el calendario laboral
  booking: {
    slotMinutes: 30,      // duración de cada cita (pendiente de confirmar con la clínica)
    capacity: 1,          // citas simultáneas por área
    horizonDays: 90,      // con cuánta antelación se puede reservar
    minNoticeMinutes: 120,
    maxPendingPerContact: 3
  },

  /* Datos: "demo" guarda todo en el navegador (para probar).
     "supabase" usa una base de datos real. Ver supabase/LEEME.md */
  backend: { provider: "demo", supabaseUrl: "", supabaseAnonKey: "",
             demoAccess: true },  // botones "Entrar como…" de prueba; solo en modo demostración. false = ocultarlos

  /* Se cargan SOLO si la persona acepta la categoría correspondiente. Vacío = no se carga nada. */
  analytics: { ga4: "", metaPixel: "" },

  /* Para usar un gestor de consentimiento externo, pon aquí la URL de su script.
     Entonces el banner propio se desactiva. */
  consent: { externalScript: "", version: 1, months: 12 }
};
