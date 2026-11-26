# Conectar las reservas a una base de datos real

Hoy la web funciona en **modo demostración**: cada navegador guarda sus propios datos. Una reserva hecha por un paciente **no llega** a la clínica salvo que la envíe por WhatsApp, y el panel de administración solo ve lo de ese navegador.

Para uso real:

1. La clínica crea el proyecto en Supabase **a su nombre**, en una región de la UE. Revisar precios y plan vigentes.
2. Firmar el acuerdo de encargado del tratamiento (DPA).
3. En el editor SQL, ejecutar `schema.sql`.
4. En *Authentication*: añadir la dirección de `acceso.html` a las URL de redirección y configurar un correo SMTP propio (el de pruebas tiene límites).
5. Crear la primera cuenta de administración (última línea de `schema.sql`).
6. En `assets/js/config.js`:

   ```js
   backend: { provider: "supabase", supabaseUrl: "https://XXXX.supabase.co", supabaseAnonKey: "clave pública anon" }
   ```

   Solo la clave **anon** (pública). La clave `service_role` no se pone nunca en la web.
7. Probar con datos ficticios: reserva sin cuenta, alta de paciente, que un paciente no vea citas de otro, cancelar y cambiar.

## Antes de usar datos reales

- El área de una cita puede revelar datos de salud (RGPD, art. 9): hace falta registro de actividades, análisis de riesgos y textos legales revisados.
- Añadir protección contra envíos automáticos (por ejemplo, un captcha) en la reserva pública.
- Activar verificación en dos pasos para las cuentas de administración.
- Definir copias de seguridad y plazo de conservación.
- Si la clínica ya usa un programa de gestión con agenda, valorar usar ese en lugar de mantener dos agendas.
