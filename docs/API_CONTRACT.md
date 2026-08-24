# API_CONTRACT - Artech

Este documento describe solamente las rutas HTTP que existen en `backend/src/`. La API se monta bajo `/api` y responde JSON, excepto las redirecciones de Google OAuth.

La URL base del frontend se configura con `NEXT_PUBLIC_API_URL`. El backend limita CORS a los origenes definidos en `CORS_ORIGIN` y permite credenciales para enviar la cookie de sesion.

## 1. Endpoints disponibles

| Metodo | Ruta | Proposito | Auth requerida |
|---|---|---|---|
| `GET` | `/api/health` | Estado basico del servicio | No |
| `GET` | `/api/products` | Lista productos activos | No |
| `GET` | `/api/products/:slug` | Obtiene un producto activo por slug | No |
| `GET` | `/api/categories` | Lista categorias activas | No |
| `GET` | `/api/brands` | Lista marcas activas | No |
| `POST` | `/api/auth/register` | Crea usuario local e inicia sesion | No |
| `POST` | `/api/auth/login` | Valida credenciales e inicia sesion | No |
| `GET` | `/api/auth/me` | Devuelve la sesion y autorizacion actuales | Si |
| `POST` | `/api/auth/logout` | Elimina la sesion si existe y limpia la cookie | No |
| `GET` | `/api/auth/google` | Inicia Google OAuth mediante redireccion | No |
| `GET` | `/api/auth/google/callback` | Valida el callback de Google y redirige al frontend | No |

No existen endpoints para carrito, pedidos, ventas, pagos, movimientos de inventario, empleados, roles administrativos, POS o caja.

## 2. Health

`GET /api/health`

Respuesta `200`:

```json
{
  "status": "ok",
  "service": "artech-backend",
  "timestamp": "2026-08-24T00:00:00.000Z"
}
```

## 3. Catalogo

### Producto

`GET /api/products` devuelve un arreglo y `GET /api/products/:slug` devuelve un objeto con la misma forma:

```json
{
  "id": "string",
  "slug": "string",
  "name": "string",
  "category": "category-slug",
  "brand": "brand-slug",
  "priceGTQ": 0,
  "priceUSD": null,
  "discountPercent": null,
  "shortSpecs": ["string"],
  "fullSpecs": [
    { "label": "string", "value": "string" }
  ],
  "images": ["/assets/products/example.webp"],
  "stock": 0,
  "hasRgbLighting": false
}
```

Notas:

- `brand` puede ser `null`.
- `priceUSD` es `null` mientras no exista una politica de conversion.
- `discountPercent` se calcula desde `price` y `previousPrice`; no se almacena directamente.
- `stock` se calcula como `physicalQuantity - reservedQuantity` y nunca es menor que cero.
- `shortSpecs` proviene de especificaciones marcadas con `isHighlighted`.
- Imagenes y especificaciones respetan `sortOrder`.
- Solo se exponen productos activos.

Si el slug no existe o el producto esta inactivo, el detalle responde `404`.

### Categoria

`GET /api/categories` devuelve:

```json
[
  {
    "id": "category-slug",
    "name": "string",
    "icon": null
  }
]
```

### Marca

`GET /api/brands` devuelve:

```json
[
  {
    "id": "brand-slug",
    "name": "string",
    "logo": null
  }
]
```

`icon` y `logo` pueden contener una referencia de texto o ser `null`. Categorias y marcas se ordenan por nombre/slug y solo incluyen registros activos.

## 4. Autenticacion

### Registro

`POST /api/auth/register`

```json
{
  "name": "Nombre",
  "email": "usuario@example.com",
  "password": "minimo-8-caracteres"
}
```

Respuesta `201`: crea un `User`, guarda solo el hash Argon2id de la contrasena, crea una `Session` y establece la cookie HttpOnly.

### Login

`POST /api/auth/login`

```json
{
  "email": "usuario@example.com",
  "password": "contrasena"
}
```

Respuesta `200`: valida que email y contrasena correspondan a una cuenta activa, crea una `Session` y establece la cookie HttpOnly. El registro exige al menos 8 caracteres; el login exige una contrasena no vacia. Ambos endpoints tienen rate limit de 10 intentos por 15 minutos por cliente.

### Sesion actual

`GET /api/auth/me`

Requiere una cookie de sesion valida. Responde `401` si no existe una sesion activa.

Registro, login y `me` usan esta respuesta publica:

```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "emailVerified": false
  },
  "roles": ["string"],
  "permissions": ["permission.key"]
}
```

El token de sesion nunca aparece en el JSON. El navegador recibe una cookie HttpOnly y el backend guarda solamente su hash.

### Logout

`POST /api/auth/logout`

Elimina la sesion asociada a la cookie cuando existe y limpia la cookie del navegador.

```json
{
  "message": "Logged out."
}
```

### Google OAuth

`GET /api/auth/google` genera estado OAuth y redirige a Google.

`GET /api/auth/google/callback` valida `code`, `state`, emisor, audiencia, identificador y email verificado. Despues crea o vincula `AuthAccount`, emite una sesion y redirige a `/cuenta`. Los errores redirigen a `/cuenta?auth=google_error`.

Las URLs se obtienen de `FRONTEND_URL` y `GOOGLE_REDIRECT_URI`; no estan hardcodeadas para produccion.

## 5. Cookies

La cookie principal usa el nombre configurado en `AUTH_COOKIE_NAME` (`artech_session` por defecto):

- `HttpOnly=true`.
- `Path=/`.
- Expiracion segun `AUTH_SESSION_TTL_DAYS`.
- Desarrollo: `SameSite=Lax`, `Secure=false`.
- Produccion: `SameSite=None`, `Secure=true`.

Google OAuth usa ademas una cookie HttpOnly temporal para validar `state`, limitada al callback y con vigencia de 10 minutos.

## 6. Errores

Los errores esperados responden:

```json
{
  "message": "Descripcion del error."
}
```

Rutas inexistentes responden `404`; errores no controlados responden `500` con `Internal server error.`. El backend registra el error interno sin enviar stack traces al cliente.

## 7. Consumo desde el frontend

- Los services de catalogo usan `fetch` asincrono y revalidacion de Next.js.
- El frontend envia `credentials: "include"` en las solicitudes de auth.
- `lib/data/` es un fallback de desarrollo solo para products/categories/brands.
- En produccion, una falla de catalogo se propaga; no se sustituyen datos reales por mocks silenciosamente.
- Auth nunca usa sesion mock ni tokens en `localStorage`.
