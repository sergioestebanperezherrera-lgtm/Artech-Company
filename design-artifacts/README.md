# Design Artifacts

Espacio para materiales generados durante diseño, QA visual y estabilización.

- `qa/`: screenshots y resultados de pruebas visuales/manuales.
- `references/`: referencias visuales o insumos de diseño que no son assets de producción.
- `archive/`: logs, videos anteriores y material histórico que ya no se carga en producción.

Los archivos aquí no deben importarse desde `app/`, `components/` o `lib/`. Si un asset es necesario en runtime, debe vivir en `public/` y tener una referencia explícita.
