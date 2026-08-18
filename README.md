# Artech

ARTECH es un frontend de e-commerce para una tienda de tecnologia y electronica. El proyecto esta construido como una experiencia premium, minimalista y responsive, preparada para integrarse mas adelante con un backend real.

## Estado Actual

Actualmente esta implementado el frontend: Home, catalogo con filtros, paginas de producto, carrito, cuenta/login con sesion mock, cambio de moneda, navegacion responsive y pruebas E2E basicas. El backend, la base de datos, la autenticacion real, pagos, inventario y administracion quedan pendientes para una etapa futura.

## Tecnologias

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Zustand
- Embla Carousel
- Playwright para pruebas funcionales

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
- `components/`: componentes reutilizables por dominio.
- `lib/`: tipos, datos mock, servicios, stores y utilidades.
- `public/`: assets servidos por la aplicacion.
- `tests/`: pruebas funcionales E2E.
- `docs/`: documentacion tecnica del proyecto.
- `design-artifacts/`: capturas, logs y materiales de QA fuera del codigo fuente.

La documentacion tecnica principal esta en [`docs/README.md`](./docs/README.md).
