# Artech - Documentacion Tecnica

Esta carpeta contiene la documentacion tecnica de ARTECH. Cubre el frontend Next.js, la API Express, PostgreSQL/Prisma, la autenticacion y las decisiones de producto y diseno.

## Estado Actual

- Frontend implementado con Next.js, React, TypeScript y Tailwind CSS.
- Home implementado con hero, video de fondo, carrusel de ofertas, categorias, productos destacados, secciones informativas y footer.
- Catalogo implementado con filtros, busqueda, paginacion y vista responsive.
- Paginas de producto implementadas con galeria, informacion principal, especificaciones y productos relacionados.
- Carrito implementado como drawer global y pagina dedicada, con persistencia local.
- Registro y login conectados al backend mediante email/password y Google OAuth.
- Sesiones persistentes almacenadas en PostgreSQL y expuestas mediante cookie HttpOnly.
- Catalogo, categorias, marcas, imagenes, especificaciones y stock servidos por una API REST real.
- Backend Express/TypeScript, Prisma y PostgreSQL implementados y desplegados de forma independiente.
- GTQ es la moneda funcional; la conversion USD aun no esta implementada.
- Responsive implementado para mobile, tablet y desktop.
- Suite E2E disponible en `tests/e2e.mjs`; sus casos legacy de auth aun describen el flujo mock y requieren actualizacion.
- El proyecto genera build de produccion correctamente.
- Checkout, pedidos operativos, pagos, administracion, empleados, POS y caja siguen pendientes.

El schema contiene modelos preliminares para roles/permisos, empleados, inventario, ventas y pagos. Su existencia en Prisma no implica que esos modulos tengan endpoints o interfaz funcional.

## Indice de Documentos

| Documento | Contenido |
|---|---|
| [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) | Descripcion del producto, audiencia, alcance actual y limites funcionales |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Tokens visuales, paleta, tipografia, radios, sombras y material Liquid Glass |
| [`UI_RULES.md`](./UI_RULES.md) | Composicion visual, uso de componentes, Home, catalogo, producto, auth, carrito y cuenta |
| [`ANIMATIONS.md`](./ANIMATIONS.md) | Movimiento, microinteracciones, video del hero, carruseles y `prefers-reduced-motion` |
| [`RESPONSIVE.md`](./RESPONSIVE.md) | Breakpoints y comportamiento por seccion |
| [`COMPONENTS.md`](./COMPONENTS.md) | Inventario de componentes, responsabilidad y ubicacion |
| [`UX_RULES.md`](./UX_RULES.md) | Reglas de interaccion, estados vacios, formularios, busqueda, filtros y gate de autenticacion |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Capas frontend/backend, datos, autenticacion, despliegue y responsabilidades |
| [`API_CONTRACT.md`](./API_CONTRACT.md) | Endpoints REST existentes y contratos expuestos al frontend |
| [`ADMIN_BOOTSTRAP.md`](./ADMIN_BOOTSTRAP.md) | Procedimiento controlado para asignar el primer `SUPER_ADMIN` en Railway |
| [`ROADMAP.md`](./ROADMAP.md) | Historial implementado y modulos futuros claramente separados |

## Como Leer Esta Documentacion

1. Empieza por `PROJECT_SPEC.md` para entender el alcance del producto.
2. Lee `ARCHITECTURE.md` para entender las fronteras entre frontend, API y base de datos.
3. Consulta `DESIGN_SYSTEM.md`, `UI_RULES.md`, `ANIMATIONS.md` y `RESPONSIVE.md` para decisiones visuales y de comportamiento.
4. Usa `COMPONENTS.md` y `UX_RULES.md` cuando necesites modificar o integrar una pantalla.
5. Revisa `API_CONTRACT.md` antes de modificar services o endpoints.
6. Consulta `ROADMAP.md` para diferenciar lo ya implementado de las etapas futuras.

Cada documento tiene una responsabilidad distinta. Cuando una regla tecnica exista en un documento especifico, conviene referenciarla desde ahi en vez de duplicarla.
