# Artech

ARTECH es una aplicacion de e-commerce de tecnologia y electronica. Incluye una tienda publica construida con Next.js, una API REST en Express y persistencia en PostgreSQL mediante Prisma.

## Estado actual

Implementado:

- Home, catalogo, filtros, busqueda, paginas de producto, carrito y cuenta.
- Catalogo real servido por la API desde PostgreSQL.
- Registro y login con email/password.
- Google OAuth.
- Sesiones persistentes mediante cookie HttpOnly.
- Modelos y migraciones para identidad, catalogo, inventario y base comercial.
- Despliegues separados de frontend y backend.

El carrito y la moneda se conservan localmente en el navegador. El checkout, pedidos operativos, pagos, administracion, empleados, POS y caja aun no tienen flujos ni endpoints funcionales. Los datos de `lib/data/` se mantienen solo como fallback explicito de desarrollo cuando la API de catalogo no esta disponible.

## Stack

| Capa | Tecnologias |
|---|---|
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS, Zustand, Embla Carousel |
| Backend | Node.js, Express, TypeScript, Zod |
| Datos | PostgreSQL, Prisma ORM |
| Auth | Email/password, Google OAuth, sesiones persistentes y cookies HttpOnly |
| QA | ESLint, TypeScript, Playwright y builds de produccion |

## Arquitectura general

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

El frontend y el backend se construyen y despliegan de forma independiente. La URL de la API se configura mediante `NEXT_PUBLIC_API_URL`; el frontend no importa codigo interno del backend.

## Estructura principal

- `app/`: rutas y layouts del frontend Next.js.
- `components/`: componentes reutilizables organizados por dominio.
- `lib/`: configuracion de API, services, stores, tipos, utilidades y fallback mock de desarrollo.
- `public/`: imagenes, video del hero y favicon.
- `tests/`: pruebas funcionales E2E del frontend.
- `backend/src/`: servidor Express, configuracion, middlewares y modulos de API.
- `backend/prisma/`: schema, migraciones, seed y datos iniciales del backend.
- `docs/`: documentacion tecnica del proyecto.

## Entorno local

### Frontend

Requiere Node.js y una API accesible.

```bash
npm install
npm run dev
```

Crea un archivo `.env.local` a partir de `.env.example`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

En desarrollo, catalogo, categorias y marcas pueden usar el fallback de `lib/data/` si la API falla. La autenticacion no usa ese fallback.

### Backend

Requiere PostgreSQL y su propia configuracion de entorno.

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

`npm run seed` es opcional y carga el catalogo inicial de desarrollo de forma idempotente. Usa `backend/.env.example` como referencia para crear `backend/.env`; nunca guardes credenciales reales en el repositorio.

Variables principales del backend:

- `DATABASE_URL`
- `PORT`
- `CORS_ORIGIN`
- `FRONTEND_URL`
- `AUTH_COOKIE_NAME`
- `AUTH_SESSION_TTL_DAYS`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

## Scripts

Frontend, desde la raiz:

| Comando | Proposito |
|---|---|
| `npm run dev` | Servidor de desarrollo Next.js |
| `npm run lint` | Revision ESLint |
| `npm run typecheck` | TypeScript sin emitir archivos |
| `npm run build` | Build de produccion del frontend |
| `npm run test:e2e` | Suite funcional Playwright; los casos legacy de auth requieren alineacion con el backend real |

Backend, desde `backend/`:

| Comando | Proposito |
|---|---|
| `npm run dev` | Servidor Express en modo watch |
| `npm run typecheck` | TypeScript del backend |
| `npm run build` | Compila `backend/src/` a `backend/dist/` |
| `npm run start` | Ejecuta el backend compilado |
| `npm run seed` | Carga datos iniciales del catalogo |
| `npm run prisma:generate` | Genera Prisma Client |
| `npm run prisma:migrate` | Crea/aplica migraciones locales con Prisma |
| `npm run prisma:studio` | Abre Prisma Studio |

## Despliegue

- Frontend: Vercel.
- Backend: Railway.
- Base de datos: PostgreSQL en Railway.
- OAuth: Google.
- Repositorio: GitHub.

Cada entorno debe proporcionar sus propias variables. No se documentan ni versionan contrasenas, tokens, connection strings reales o client secrets.

## Documentacion

- [Indice tecnico](./docs/README.md)
- [Arquitectura](./docs/ARCHITECTURE.md)
- [Contrato de API](./docs/API_CONTRACT.md)
- [Especificacion del producto](./docs/PROJECT_SPEC.md)
- [Roadmap](./docs/ROADMAP.md)
