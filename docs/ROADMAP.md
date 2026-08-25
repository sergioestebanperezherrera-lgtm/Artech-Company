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

Estado: implementada con backend real.

- `AuthPanel`.
- Validaciones.
- Mostrar/ocultar contrasena.
- Cierre con Escape.
- Registro y login email/password.
- Google OAuth.
- Sesiones persistentes mediante cookie HttpOnly.

### Fase 9 - Carrito

Estado: implementada localmente en frontend.

- `CartDrawer`.
- Pagina `/carrito`.
- Agregar, actualizar y eliminar productos.
- Persistencia local.
- Gate conectado a la sesion real.
- Checkout y sincronizacion con backend pendientes.

### Fase 10 - Panel de usuario

Estado: implementada parcialmente con identidad real.

- Vista `/cuenta`.
- Nombre y email obtenidos de la sesion.
- Cierre de sesion real.
- Estados vacios para pedidos/direcciones.
- Edicion de perfil, direcciones e historial real pendientes.

### Fase 11 - Pulido final y QA

Estado: implementada.

- Responsive.
- Accesibilidad basica.
- Microinteracciones.
- Optimizaciones de rendimiento.
- Suite E2E base; los casos legacy de auth requieren alineacion con el backend real.
- Build de produccion verificado.

## Backend Implementado

### Fundacion

Estado: implementada.

- Backend independiente en `backend/` con Express y TypeScript.
- PostgreSQL y Prisma ORM.
- Configuracion por entorno, CORS con credenciales y manejo central de errores.
- Despliegue independiente en Railway.

### Identidad y autenticacion

Estado: implementada para clientes.

- `User`, `AuthAccount`, `Session`, `Role`, `Permission`, `UserRole` y `RolePermission`.
- Registro y login email/password con hashes Argon2id.
- Google OAuth.
- Cookies HttpOnly adaptadas a desarrollo y produccion cross-site.
- Endpoints de registro, login, sesion actual y logout.

Roles y permisos forman parte de la respuesta de autenticacion, pero no existe panel para administrarlos.

### Admin Phase 1 - Seguridad interna / RBAC

Estado: implementada.

- Roles y permisos iniciales mediante seed idempotente.
- Matriz `RolePermission` para `SUPER_ADMIN`, `STORE_MANAGER`, `CASHIER`, `INVENTORY_CLERK` y `HR_ACCOUNTANT`.
- Contexto de sesion tipado en requests autenticadas.
- Middlewares `requireAuth`, `requireAdminAccess` y `requirePermission`.
- Endpoint `GET /api/admin/me` con respuestas `401`, `403` y `200`.
- Script manual `npm run admin:grant -- <email>` para desarrollo; no crea usuarios ni credenciales.
- Bootstrap productivo separado para el primer `SUPER_ADMIN`, limitado a Railway, con confirmaciones explicitas y cierre despues de la primera asignacion.

No incluye UI `/admin`, CRUD de empleados, gestion de roles, POS, caja o nomina.

### Catalogo

Estado: implementada.

- `Category`, `Brand`, `Product`, `ProductImage` y `ProductSpecification`.
- `Inventory` y calculo de stock disponible.
- Endpoints de productos, detalle por slug, categorias y marcas.
- Seed idempotente propiedad del backend.
- Integracion progresiva del frontend con fallback mock solo en desarrollo.

### Base comercial

Estado: modelada, no operativa.

- Prisma incluye `InventoryMovement`, `Sale`, `SaleItem` y `Payment`.
- No existen endpoints, services de negocio, checkout ni interfaces administrativas para estos modelos.

## Proximas Etapas

Estas etapas no estan implementadas como flujos completos:

- Checkout, pedidos y pagos reales.
- Carrito persistido/sincronizado con la cuenta.
- Administracion de productos, categorias, marcas e inventario.
- Operaciones y trazabilidad avanzada de movimientos de inventario.
- Gestion de roles y permisos.
- Sistema de empleados, puestos, compensacion, turnos y asistencia.
- Panel `/admin`.
- POS y caja.
- Nomina y auditoria interna.

Algunos dominios ya tienen modelos preliminares en Prisma. Cada modulo futuro debe validar esos modelos, definir permisos y actualizar `API_CONTRACT.md` antes de exponer endpoints.
