# Artech

Frontend de e-commerce para ARTECH construido con Next.js, TypeScript y Tailwind CSS.

La fuente de verdad del proyecto vive en [`docs/README.md`](./docs/README.md). Antes de cambiar arquitectura, diseño, datos mock o comportamiento de UX, revisa esa documentación.

## Comandos

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

## Estructura Principal

- `app/`: rutas App Router, layout global y estilos globales.
- `components/`: UI reutilizable por dominio.
- `lib/`: datos mock, servicios, stores, tipos y utilidades.
- `public/`: assets servidos por la aplicación.
- `docs/`: especificación, arquitectura y reglas del proyecto.
- `design-artifacts/`: capturas, logs y materiales de QA fuera del código fuente.
