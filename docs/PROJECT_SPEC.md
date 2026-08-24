# PROJECT_SPEC - Artech

## 1. Que es Artech

ARTECH es un e-commerce de electronica y tecnologia con una tienda publica funcional, API propia y catalogo persistido en PostgreSQL.

- **Logo:** isotipo estilizado usado en navbar/favicon + wordmark "Artech".
- **Personalidad de marca:** premium, minimalista, tecnologica y monocromatica.
- **Experiencia:** compra clara y responsive sin sacrificar la identidad visual.

## 2. Que vende

Electronica y tecnologia en general, con foco principal en:

- Celulares.
- Tarjetas graficas (GPU).
- Memoria RAM y procesadores.
- Monitores.
- Perifericos.
- Componentes, consolas y accesorios.

No es una tienda gamer de nicho. Es una tienda de tecnologia general con catalogo fuerte en componentes de PC.

## 3. Audiencia

Consumidores generales interesados en tecnologia. La experiencia debe funcionar tanto para alguien que busca un celular como para alguien que compara una tarjeta grafica o un monitor.

## 4. Alcance actual

| Area | Estado |
|---|---|
| Home, catalogo, busqueda, filtros y paginas de producto | Implementado |
| Catalogo desde Express/PostgreSQL | Implementado |
| Registro y login email/password | Implementado |
| Google OAuth | Implementado |
| Sesiones persistentes con cookie HttpOnly | Implementado |
| Carrito | Implementado localmente en el navegador |
| Cuenta | Identidad y sesion reales; edicion de perfil, direcciones y pedidos pendientes |
| Inventario | Modelo y lectura de stock disponibles; gestion operativa pendiente |
| Roles y permisos | Modelos y datos incluidos en auth; administracion pendiente |
| Ventas y pagos | Modelos Prisma existentes; sin endpoints ni checkout |
| Empleados, admin, POS, caja y nomina | Planeado |

## 5. Mapa del sitio

| Ruta | Pagina |
|---|---|
| `/` | Home |
| `/catalogo` | Catalogo con filtros y paginacion |
| `/producto/[slug]` | Pagina de producto individual |
| `/carrito` | Pagina local del carrito |
| `/cuenta` | Cuenta del usuario autenticado o acceso a login/registro |
| Login / Registro | Modal global conectado a la API |

La ruta de producto usa un slug legible, por ejemplo `/producto/rtx-5080`.

## 6. Reglas de negocio actuales

- **Fuente de catalogo:** PostgreSQL a traves de la API Express.
- **Fallback de desarrollo:** `lib/data/` se usa solo si falla la API de catalogo fuera de produccion.
- **Moneda:** GTQ es la unica moneda funcional. `priceUSD` permanece `null` y no existe tipo de cambio hardcodeado.
- **Precio:** la API expone `priceGTQ` y calcula `discountPercent` desde `price` y `previousPrice`.
- **Stock:** se deriva de `Inventory.physicalQuantity - Inventory.reservedQuantity`.
- **Promociones:** un producto agotado permanece en catalogo y detalle, pero no se selecciona automaticamente para espacios de compra inmediata.
- **Autenticacion:** email/password y Google OAuth crean sesiones persistentes; el token no se almacena en `localStorage`.
- **Carrito:** se persiste en `localStorage` y no esta sincronizado con la cuenta o la base de datos.
- **Checkout:** no existe cobro ni creacion de pedido real.
- **Idioma:** espanol; no existe sistema i18n completo.
- **Assets:** imagenes y video se sirven desde `public/`; la API almacena rutas, no archivos binarios.

## 7. Produccion

- Frontend desplegado en Vercel.
- Backend desplegado en Railway.
- PostgreSQL gestionado en Railway.
- Google como proveedor OAuth.
- GitHub como repositorio.

Los entornos proporcionan sus propias variables. La documentacion nunca debe incluir secretos, contrasenas, tokens o connection strings reales.

## 8. Roadmap funcional

Planeado, no implementado como flujo completo:

- Checkout y pedidos reales.
- Pagos.
- Administracion del catalogo.
- Gestion y trazabilidad avanzada de inventario.
- Panel `/admin`.
- Empleados, puestos, compensacion, turnos y asistencia.
- POS y caja.
- Nomina y auditoria interna.

Los modelos preliminares que ya existen en Prisma deben reutilizarse y validarse cuando se implemente cada modulo; no se consideran funcionalidad terminada por si solos.
