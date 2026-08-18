# ROADMAP - Artech

Este roadmap conserva el historial de construccion del frontend y separa claramente lo ya implementado de las etapas futuras.

## Frontend Implementado

### Fase 0 - Fundacion del proyecto

Estado: implementada.

- Setup de Next.js + TypeScript + Tailwind.
- Tokens base en `globals.css` y `tailwind.config.ts`.
- Estructura de carpetas inicial.
- Tipografia Inter.

### Fase 1 - Atomos de UI

Estado: implementada.

- `Button`
- `IconCircleButton`
- `Badge`
- `Card`

### Fase 2 - Layout global

Estado: implementada.

- `Navbar`
- `MobileMenu`
- `Footer`
- `GlobalOverlays`
- Integracion global de carrito y autenticacion.

Nota: el fondo visual evoluciono durante el proyecto. El hero actual usa video local y el resto del sitio usa fondo ambiental CSS.

### Fase 3 - ProductCard

Estado: implementada.

- Card reutilizable.
- Navegacion al detalle desde imagen/nombre/area principal.
- Acciones separadas para informacion y carrito.
- Estado agotado.
- Borde RGB exclusivo para GPUs compatibles.

### Fase 4 - Carruseles

Estado: implementada.

- Carrusel principal de ofertas.
- `AutoScrollCarousel` reutilizable.
- Controles manuales, indicadores, autoplay y soporte responsive.

### Fase 5 - Home

Estado: implementada.

- Hero de marca con video.
- Carrusel de ofertas.
- Productos destacados.
- Categorias.
- Seccion de confianza.
- Footer.

### Fase 6 - Catalogo

Estado: implementada.

- Filtros por categoria, marca, precio y specs.
- Drawer de filtros en mobile.
- Grid de productos.
- Paginacion.
- Estados vacios.

### Fase 7 - Pagina de producto

Estado: implementada.

- Galeria.
- Informacion principal.
- Specs.
- Productos relacionados.
- RGB en informacion de GPU compatible.

### Fase 8 - Login / Registro

Estado: implementada como mock frontend.

- `AuthPanel`.
- Validaciones.
- Mostrar/ocultar contrasena.
- Cierre con Escape.
- Accesos sociales decorativos pendientes de backend/OAuth.

### Fase 9 - Carrito

Estado: implementada como frontend local.

- `CartDrawer`.
- Pagina `/carrito`.
- Agregar, actualizar y eliminar productos.
- Persistencia local.
- Gate de autenticacion mock para compra.

### Fase 10 - Panel de usuario

Estado: implementada como mock frontend.

- Vista `/cuenta`.
- Datos de usuario mock.
- Estados vacios para pedidos/direcciones.

### Fase 11 - Pulido final y QA

Estado: implementada.

- Responsive.
- Accesibilidad basica.
- Microinteracciones.
- Optimizaciones de rendimiento.
- Pruebas E2E.
- Build de produccion verificado.

## Proximas Etapas

Estas etapas no estan implementadas y requieren definicion tecnica antes de construirse:

- Backend/API.
- Base de datos.
- Autenticacion real.
- Roles y permisos.
- Administracion de productos.
- Inventario.
- Pedidos y ventas.
- Sistema de empleados.
- Panel administrativo.
- POS/caja.

No hay una arquitectura definitiva decidida para estas etapas futuras. Cualquier decision debe documentarse antes de modificar servicios, modelos o flujos existentes.
