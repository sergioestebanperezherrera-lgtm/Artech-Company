# API_CONTRACT — Artech

No existe backend implementado en esta etapa. Este documento define la **forma de datos** que `lib/types/` y `lib/data/` deben respetar, y los endpoints que se esperaría exponer cuando el backend se construya (ver `ARCHITECTURE.md` sección 5). El objetivo es que conectar un backend real en el futuro sea un cambio de implementación en `lib/services/`, no una reescritura de componentes.

Todo lo aquí definido es **propuesto**, a validar cuando exista el equipo/etapa de backend — pero debe usarse como contrato de trabajo mientras tanto.

## 1. Modelo `Product`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` | Identificador interno |
| `slug` | `string` | Usado en la URL (`/producto/[slug]`), ver `UX_RULES.md` sección 9 |
| `name` | `string` | |
| `category` | `string` | Referencia a `Category.id` |
| `brand` | `string` | Referencia a `Brand.id` |
| `priceGTQ` | `number` | Precio en Quetzales |
| `priceUSD` | `number` | Precio en Dólares — ambas monedas se guardan explícitamente, no se calculan por conversión en tiempo real (ver `UX_RULES.md` sección 7) |
| `discountPercent` | `number \| null` | Si existe, la tarjeta muestra `Badge` de descuento |
| `shortSpecs` | `string[]` | 2–3 líneas cortas mostradas en `ProductCard` |
| `fullSpecs` | `{ label: string; value: string }[]` | Tabla completa, mostrada tras "Más info" |
| `images` | `string[]` | Rutas a imágenes (placeholders en esta etapa, ver `PROJECT_SPEC.md`) |
| `stock` | `number` | `0` implica estado "Agotado" (ver `UX_RULES.md` sección 2) |
| `hasRgbLighting` | `boolean` | Determina si la tarjeta aplica el borde animado `accent-rgb` (ver `UI_RULES.md` sección 3) |

## 2. Modelo `Category`

| Campo | Tipo |
|---|---|
| `id` | `string` |
| `name` | `string` |
| `icon` | `string` (referencia a ícono de línea, no imagen) |

Categorías principales según `PROJECT_SPEC.md`: Celulares, Tarjetas gráficas, CPU/RAM, Monitores, Periféricos, Componentes, Consolas, Accesorios.

## 3. Modelo `Brand`

| Campo | Tipo |
|---|---|
| `id` | `string` |
| `name` | `string` |
| `logo` | `string` (placeholder, ver regla de assets en `PROJECT_SPEC.md`) |

## 4. Modelo `CartItem`

| Campo | Tipo |
|---|---|
| `productId` | `string` |
| `quantity` | `number` |

El precio y demás datos del producto se resuelven contra `Product` en tiempo de render — `CartItem` no duplica esa información.

## 5. Modelo `User`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` | |
| `name` | `string` | |
| `email` | `string` | |

Mock en esta etapa — sin contraseña real ni backend de autenticación (ver `PROJECT_SPEC.md`).

## 6. Modelo `Order`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` | |
| `userId` | `string` | |
| `items` | `CartItem[]` | |
| `status` | `string` | Placeholder — sin flujo de pago real todavía |
| `createdAt` | `string` (ISO date) | |

No se implementa en esta etapa; existe solo para que `OrdersEmptyState` y el futuro historial de pedidos tengan un modelo de referencia (ver `COMPONENTS.md`).

## 7. Endpoints propuestos (para cuando exista backend)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/products` | Lista de productos, con soporte de query params para filtros (categoría, marca, rango de precio, specs) y paginación |
| `GET` | `/api/products/:slug` | Detalle de un producto |
| `GET` | `/api/categories` | Lista de categorías |
| `GET` | `/api/brands` | Lista de marcas |
| `POST` | `/api/auth/login` | Login real (reemplaza el mock de `useAuth()`) |
| `POST` | `/api/auth/register` | Registro real |
| `GET` | `/api/cart` | Carrito del usuario autenticado (si se decide persistir en backend) |
| `POST` | `/api/cart` | Agregar/actualizar ítem del carrito |
| `GET` | `/api/orders` | Historial de pedidos del usuario |

## 8. Ubicación de los datos mock

`lib/data/` debe contener archivos (JSON o TS) con esta misma forma exacta, para que `lib/services/` pueda simplemente cambiar de fuente (mock → fetch real) sin que ningún componente necesite modificarse.
