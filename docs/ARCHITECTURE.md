# ARCHITECTURE - Artech

## 1. Vista general

ARTECH es una aplicacion full stack con frontend y backend independientes. La API es la unica frontera entre la tienda y PostgreSQL.

```text
Usuario
  -> Frontend Next.js
  -> API REST Express
  -> Prisma ORM
  -> PostgreSQL

Google OAuth
  -> Backend de autenticacion
  -> User / AuthAccount / Session
```

En produccion, el frontend se despliega en Vercel y el backend junto con PostgreSQL se opera en Railway. Cada servicio tiene su propio `package.json`, `tsconfig.json`, build y variables de entorno.

## 2. Stack por capa

| Capa | Tecnologia | Responsabilidad |
|---|---|---|
| Frontend | Next.js App Router, React, TypeScript | Rutas, renderizado, composicion de paginas e interaccion |
| UI | Tailwind CSS, CSS variables, Lucide, Embla | Sistema visual, responsive, iconos y carruseles |
| Estado cliente | Zustand | Carrito, moneda y estado de sesion en memoria |
| API | Node.js, Express, TypeScript, Zod | Rutas REST, validacion, auth y adaptacion de datos |
| Persistencia | Prisma ORM, PostgreSQL | Modelos, relaciones, migraciones y consultas |
| Auth | Argon2id, Google OAuth, sesiones opacas | Credenciales, cuentas externas y sesiones persistentes |
| QA | ESLint, TypeScript, Playwright | Verificaciones estaticas y pruebas funcionales |

## 3. Estructura del repositorio

```text
artech/
|-- app/                       # Rutas App Router del frontend
|-- components/                # UI reutilizable por dominio
|-- lib/
|   |-- config/                # Configuracion publica de API
|   |-- data/                  # Fallback mock solo para desarrollo
|   |-- services/              # Acceso asincrono a API
|   |-- stores/                # Estado cliente
|   |-- types/                 # Contratos TypeScript del frontend
|   `-- utils/                 # Formato, busqueda y utilidades
|-- public/                    # Assets del frontend
|-- tests/                     # Pruebas E2E
|-- backend/
|   |-- src/
|   |   |-- config/            # Entorno y Prisma Client
|   |   |-- middlewares/       # Errores, 404 y async handlers
|   |   |-- modules/           # Auth, products, categories y brands
|   |   |-- routes/            # Composicion de rutas y health
|   |   `-- server.ts          # Entrada del servidor
|   `-- prisma/
|       |-- schema.prisma      # Modelo de datos actual
|       |-- migrations/        # Historial inmutable de migraciones
|       |-- seed.ts            # Seed idempotente
|       `-- seed-data/         # Datos iniciales propiedad del backend
`-- docs/                      # Documentacion tecnica
```

El `tsconfig.json` de la raiz excluye `backend/`. El backend se valida y compila con `backend/tsconfig.json`; sus dependencias no forman parte del build de Next.js.

## 4. Frontend

Las paginas de `app/` obtienen datos mediante services asincronos y componen componentes de `components/`. Las consultas de catalogo se ejecutan principalmente desde Server Components y usan la URL centralizada en `lib/config/api.ts`.

Services actuales:

- `productService`: lista, detalle por slug, ofertas, destacados y relacionados.
- `categoryService`: categorias activas.
- `brandService`: marcas activas.
- `authService`: registro, login, sesion actual, logout y entrada a Google OAuth.

`productService`, `categoryService` y `brandService` usan `lib/data/` solamente como fallback explicito cuando la API falla en desarrollo. En produccion el error se propaga; no se mezclan silenciosamente datos reales y mock. Auth no tiene fallback mock.

## 5. Estado y persistencia del navegador

- Carrito: persistido en `localStorage` mediante Zustand (`artech-cart`).
- Moneda: persistida mediante Zustand (`artech-currency`), aunque GTQ es la unica moneda funcional visible actualmente.
- Auth: estado cliente en memoria sincronizado con `/api/auth/me`; el token de sesion no se guarda en Zustand ni en `localStorage`.

El carrito aun no se sincroniza con PostgreSQL y no existe checkout real.

## 6. Backend y API

Express monta todas las rutas bajo `/api`. Cada modulo comercial sigue la separacion routes -> controller -> service -> repository. Prisma es el unico acceso a PostgreSQL.

Modulos HTTP implementados:

- `health`
- `products`
- `categories`
- `brands`
- `auth`
- `admin` (identidad interna y autorizacion base)

CORS usa una lista de origenes configurada por `CORS_ORIGIN` y `credentials: true`; no usa wildcard. Las redirecciones OAuth se construyen desde `FRONTEND_URL`, y el callback se configura con `GOOGLE_REDIRECT_URI`.

## 7. Autenticacion y sesiones

### Email/password

```text
Formulario frontend
  -> POST /api/auth/register o /api/auth/login
  -> validacion Zod
  -> hash/verificacion Argon2id
  -> Session en PostgreSQL
  -> cookie HttpOnly
```

La base de datos almacena `passwordHash`, nunca la contrasena en texto plano. El token de sesion se genera de forma aleatoria; solo su hash SHA-256 se guarda en `Session`.

### Google OAuth

```text
Frontend
  -> GET /api/auth/google
  -> Google
  -> GET /api/auth/google/callback
  -> User + AuthAccount
  -> Session
  -> cookie HttpOnly
  -> /cuenta
```

El estado OAuth se valida mediante una cookie HttpOnly temporal. En desarrollo las cookies usan `SameSite=Lax` y `Secure=false`; en produccion usan `SameSite=None` y `Secure=true` para permitir el frontend y backend cross-site.

## 8. Modelo de datos actual

Implementado y consumido por la API:

- Identidad: `User`, `AuthAccount`, `Session`, `Role`, `Permission`, `UserRole` y `RolePermission`.
- Catalogo: `Category`, `Brand`, `Product`, `ProductImage` y `ProductSpecification`.
- Stock: `Inventory`; la API calcula stock disponible como `physicalQuantity - reservedQuantity`.

Modelado en Prisma, pero sin modulo HTTP o flujo completo:

- `Employee`.
- `InventoryMovement`.
- `Sale`, `SaleItem` y `Payment`.

La presencia de estos modelos y sus migraciones no equivale a una implementacion de administracion, pedidos, pagos, POS o caja.

## 9. Responsabilidades y limites actuales

| Area | Estado real |
|---|---|
| Tienda publica y catalogo | Implementado |
| Catalogo PostgreSQL -> API -> frontend | Implementado |
| Registro, login, Google OAuth y logout | Implementado |
| Roles/permisos en respuestas de auth | Infraestructura disponible; sin panel de gestion |
| Seguridad interna RBAC y `/api/admin/me` | Implementado |
| Carrito | Implementado localmente en frontend |
| Inventario | Modelo y lectura de stock implementados; operaciones administrativas pendientes |
| Ventas y pagos | Modelos existentes; sin endpoints ni flujo de checkout |
| Empleados, admin, POS y caja | Planeado |

## 10. Convenciones

- No importar modulos internos de `backend/` desde el frontend.
- No acceder a PostgreSQL desde Next.js; toda persistencia pasa por la API Express.
- No exponer tokens de sesion ni secretos al cliente.
- Mantener contratos externos en `API_CONTRACT.md` sincronizados con las rutas reales.
- No presentar modelos preliminares como funcionalidades terminadas.
