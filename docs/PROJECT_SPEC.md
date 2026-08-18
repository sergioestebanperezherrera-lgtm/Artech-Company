# PROJECT_SPEC - Artech

## 1. Que es Artech

ARTECH es un e-commerce de electronica y tecnologia. El nombre combina una identidad visual sobria con una experiencia de compra moderna, clara y accesible.

- **Logo:** isotipo estilizado usado en navbar/favicon + wordmark "Artech".
- **Personalidad de marca:** premium, minimalista, tecnologica y monocromatica. El sitio debe sentirse moderno sin volverse intimidante ni perder claridad de compra.

## 2. Que vende

Electronica y tecnologia en general, con foco principal en:

- Celulares
- Tarjetas graficas (GPU)
- Memoria RAM
- Procesadores (CPU)
- Monitores
- Perifericos

No es una tienda gamer de nicho. Es una tienda de tecnologia general con catalogo fuerte en componentes de PC.

## 3. Audiencia

Consumidores generales interesados en tecnologia. La experiencia debe funcionar tanto para alguien que busca un celular como para alguien que compara una tarjeta grafica o un monitor.

## 4. Alcance de esta etapa

El frontend esta implementado con datos mock y estado local persistente donde corresponde. La integracion con backend real queda para una fase futura.

| Incluido actualmente | Pendiente para fases futuras |
|---|---|
| Home, catalogo, paginas de producto, carrito y cuenta | Backend real y base de datos |
| Interacciones de UI: filtros, busqueda, carrito, login/registro mock | Autenticacion real |
| Datos de producto simulados | Pasarela de pago real |
| Stores locales para carrito, moneda y sesion mock | Inventario, pedidos y ventas reales |
| Responsive y QA funcional E2E | Panel administrativo, empleados, POS/caja |

El login/registro, el carrito y el panel de usuario funcionan en el frontend mediante mocks. No hay validacion de credenciales real, tokens, OAuth ni pagos.

## 5. Mapa del sitio

| Ruta | Pagina |
|---|---|
| `/` | Home |
| `/catalogo` | Catalogo con filtros y paginacion |
| `/producto/[slug]` | Pagina de producto individual |
| `/carrito` | Pagina de carrito |
| `/cuenta` | Panel de usuario con sesion mock |
| Login / Registro | Modal global accesible desde cuenta o desde el gate de compra |

Convencion de rutas de producto: slug legible, por ejemplo `/producto/rtx-5080`, no ID numerico.

## 6. Reglas de negocio

- **Moneda:** el sitio soporta Quetzales (GTQ) y Dolares (USD). Todo componente que muestre precio debe leer la moneda seleccionada desde el store global.
- **Idioma:** espanol en esta etapa. No existe selector de idioma ni estructura i18n completa.
- **Datos mock:** los productos, marcas y categorias viven en `lib/data/` y se consumen mediante `lib/services/`.
- **Assets:** las imagenes actuales viven en `public/assets/` o `public/videos/`. Los datos mock deben apuntar a assets propios del proyecto o placeholders claros, nunca depender de URLs externas no controladas.
- **Backend futuro:** cualquier integracion real debe mantener la forma de datos documentada en `API_CONTRACT.md` o actualizar ese contrato antes de cambiar servicios y componentes.
