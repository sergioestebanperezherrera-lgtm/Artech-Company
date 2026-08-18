# Artech - Documentacion Tecnica

Esta carpeta contiene la documentacion tecnica del frontend de ARTECH. Sirve para entender que hace el proyecto, como esta organizado, que decisiones de diseno y arquitectura se tomaron, y que queda pendiente para la integracion futura con backend.

## Estado Actual

- Frontend implementado con Next.js, TypeScript y Tailwind CSS.
- Home implementado con hero, video de fondo, carrusel de ofertas, categorias, productos destacados, secciones informativas y footer.
- Catalogo implementado con filtros, busqueda, paginacion y vista responsive.
- Paginas de producto implementadas con galeria, informacion principal, especificaciones y productos relacionados.
- Carrito implementado como drawer global y pagina dedicada, con persistencia local.
- Interfaz de cuenta/login/registro implementada con sesion mock y persistencia local.
- Selector de moneda implementado con persistencia local.
- Responsive implementado para mobile, tablet y desktop.
- Pruebas funcionales E2E disponibles en `tests/e2e.mjs`.
- El proyecto genera build de produccion correctamente.
- Backend, base de datos, autenticacion real, roles, inventario, pedidos, panel administrativo y POS quedan pendientes.

## Indice de Documentos

| Documento | Contenido |
|---|---|
| [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) | Descripcion del producto, audiencia, alcance actual y reglas de negocio |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Tokens visuales, paleta, tipografia, radios, sombras y material Liquid Glass |
| [`UI_RULES.md`](./UI_RULES.md) | Composicion visual, uso de componentes, Home, catalogo, producto, auth, carrito y cuenta |
| [`ANIMATIONS.md`](./ANIMATIONS.md) | Movimiento, microinteracciones, video del hero, carruseles y `prefers-reduced-motion` |
| [`RESPONSIVE.md`](./RESPONSIVE.md) | Breakpoints y comportamiento por seccion |
| [`COMPONENTS.md`](./COMPONENTS.md) | Inventario de componentes, responsabilidad y ubicacion |
| [`UX_RULES.md`](./UX_RULES.md) | Reglas de interaccion, estados vacios, formularios, busqueda, filtros y gate de autenticacion |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Stack, estructura de carpetas, separacion de responsabilidades y capa de datos |
| [`API_CONTRACT.md`](./API_CONTRACT.md) | Modelos de datos mock y endpoints propuestos para backend futuro |
| [`ROADMAP.md`](./ROADMAP.md) | Historial de fases del frontend y proximas etapas |

## Como Leer Esta Documentacion

1. Empieza por `PROJECT_SPEC.md` para entender el alcance del producto.
2. Lee `ARCHITECTURE.md` para ubicar rutas, componentes, services y stores.
3. Consulta `DESIGN_SYSTEM.md`, `UI_RULES.md`, `ANIMATIONS.md` y `RESPONSIVE.md` para decisiones visuales y de comportamiento.
4. Usa `COMPONENTS.md` y `UX_RULES.md` cuando necesites modificar o integrar una pantalla.
5. Revisa `API_CONTRACT.md` antes de reemplazar datos mock por endpoints reales.
6. Consulta `ROADMAP.md` para diferenciar lo ya implementado de las etapas futuras.

Cada documento tiene una responsabilidad distinta. Cuando una regla tecnica exista en un documento especifico, conviene referenciarla desde ahi en vez de duplicarla.
