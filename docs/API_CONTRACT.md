# API_CONTRACT - Artech

No existe backend implementado actualmente. Este documento describe los modelos que usan los datos mock y propone endpoints para una futura API.

Todo endpoint mencionado aqui es **propuesto**. No debe interpretarse como una API existente.

## 1. Datos Mock Actuales

Los datos viven en:

- `lib/data/products.ts`
- `lib/data/categories.ts`
- `lib/data/brands.ts`

La UI consume esos datos mediante:

- `lib/services/productService.ts`
- `lib/services/categoryService.ts`
- `lib/services/brandService.ts`

Cuando exista backend, los services son el punto natural para reemplazar mocks por `fetch` o por la capa de cliente elegida.

## 2. Modelo `Product`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` | Identificador interno |
| `slug` | `string` | Usado en `/producto/[slug]` |
| `name` | `string` | Nombre visible |
| `category` | `string` | Referencia a `Category.id` |
| `brand` | `string` | Referencia a `Brand.id` |
| `priceGTQ` | `number` | Precio en Quetzales |
| `priceUSD` | `number` | Precio en Dolares |
| `discountPercent` | `number \| null` | Descuento visible si existe |
| `shortSpecs` | `string[]` | Specs resumidas para cards |
| `fullSpecs` | `{ label: string; value: string }[]` | Specs completas para detalle |
| `images` | `string[]` | Rutas a assets locales o placeholders |
| `stock` | `number` | `0` implica "Agotado" |
| `hasRgbLighting` | `boolean` | Activa borde RGB solo cuando corresponde |

## 3. Modelo `Category`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` | Identificador usado en filtros |
| `name` | `string` | Nombre visible |
| `icon` | `string` | Referencia conceptual a icono de linea |

Categorias actuales: Celulares, Tarjetas graficas, CPU/RAM, Monitores, Perifericos, Componentes, Consolas y Accesorios.

## 4. Modelo `Brand`

| Campo | Tipo |
|---|---|
| `id` | `string` |
| `name` | `string` |
| `logo` | `string` |

## 5. Modelo `CartItem`

| Campo | Tipo | Notas |
|---|---|---|
| `productId` | `string` | Referencia a `Product.id` |
| `quantity` | `number` | Cantidad en carrito |

El precio se resuelve contra `Product`; `CartItem` no duplica datos de producto.

## 6. Modelo `User`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` | Identificador mock |
| `name` | `string` | Nombre visible |
| `email` | `string` | Email visible |

La sesion actual es mock y local. No hay contrasenas reales ni tokens.

## 7. Modelo `Order`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `string` | Futuro identificador |
| `userId` | `string` | Usuario asociado |
| `items` | `CartItem[]` | Items comprados |
| `status` | `string` | Estado futuro del pedido |
| `createdAt` | `string` | Fecha ISO |

Pedidos reales no estan implementados todavia.

## 8. Endpoints Propuestos Para Backend Futuro

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/products` | Lista de productos con filtros y paginacion |
| `GET` | `/api/products/:slug` | Detalle de producto |
| `GET` | `/api/categories` | Lista de categorias |
| `GET` | `/api/brands` | Lista de marcas |
| `POST` | `/api/auth/login` | Login real futuro |
| `POST` | `/api/auth/register` | Registro real futuro |
| `GET` | `/api/cart` | Carrito persistido en backend, si se decide implementarlo |
| `POST` | `/api/cart` | Agregar o actualizar items |
| `GET` | `/api/orders` | Historial de pedidos |

## 9. Criterios Para Integrar Backend

- Mantener modelos compatibles o actualizar este contrato primero.
- Evitar que componentes importen datos mock directamente.
- Centralizar llamadas reales en services o capa equivalente.
- No mezclar autenticacion real con la sesion mock sin definir estrategia de migracion.
