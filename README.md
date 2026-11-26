# Clínica Lustro · web (borrador de trabajo)

Sitio estático para GitHub Pages: web pública, calculadora de salud, reservas, área de paciente y administración.

| Qué | Dónde |
|---|---|
| Textos, especialidades, equipo, artículos | `tools/content.py` |
| Plantillas de página | `tools/build.py` |
| Ilustración de la fachada | `tools/fachada.py` |
| Imágenes ambientales | `tools/art.py` (necesita numpy y Pillow) |
| Horario, citas, servicios externos | `assets/js/config.js` |
| Base de datos | `supabase/` |

```bash
python3 tools/build.py   # regenerar las páginas tras cambiar textos
node tools/test.js       # pruebas de citas, permisos y calculadora
```

## Pendiente antes de que sea la web oficial

- Validación de todos los textos médicos por la dirección médica.
- Revisión legal de aviso legal, privacidad y cookies (hay campos «pendiente»).
- Confirmar: duración de las citas, festivos, lista de tratamientos por área y quién atiende salud hormonal y fisioterapia.
- Conectar la base de datos (hoy las reservas están en modo demostración).
- Conectar el gestor de cookies y, si hay campaña, las etiquetas de medición.
- Quitar `noindex`: `INDEXABLE = True` en `tools/build.py`.
