# UX_RULES — Artech

Reglas de **comportamiento e interacción** del sitio. Para apariencia visual, ver `DESIGN_SYSTEM.md` y `UI_RULES.md`. Para animaciones, ver `ANIMATIONS.md`.

## 1. Estados vacíos y de carga

- Cualquier estado vacío (carrito vacío, catálogo sin resultados de filtro, "Mis Pedidos" sin historial) debe mostrarse con un **mensaje amigable + ícono de línea** — nunca como un mensaje de error técnico o en color rojo de alerta.
- Imágenes en carga: mostrar un skeleton con pulso sutil, nunca un spinner.

## 2. Producto sin stock

- La `ProductCard` correspondiente se muestra con opacidad reducida.
- Se agrega un `Badge` con la etiqueta "Agotado".
- El botón "Añadir al carrito" se deshabilita (no se oculta).

## 3. Buscador

- El ícono de lupa en el navbar, al hacer clic, **se expande** en un campo de texto con resultados en dropdown en vivo (búsqueda mientras se escribe).
- No navega a una página de resultados separada hasta que el usuario presiona Enter.
- La búsqueda debe permitir coincidencias por nombre, marca, categoría, y coincidencias parciales de palabras.

## 4. Filtros del catálogo

- Nivel de filtro: **avanzado** — categoría, marca, rango de precio, y especificaciones técnicas que cambian dinámicamente según el tipo de producto (ej. RAM/almacenamiento para celulares; VRAM/bus para GPU; tamaño/resolución para monitores).
- Comportamiento de apertura/cierre y adaptación mobile: ver `RESPONSIVE.md`.

## 5. Navegación de resultados del catálogo

- **Paginación clásica** (1, 2, 3...). No usar scroll infinito ni botón "cargar más" — decisión explícita de producto.

## 6. Gate de autenticación en el carrito

- El carrito permite revisar productos y cantidades sin necesidad de sesión iniciada.
- Al intentar **proceder al pago**, si no hay sesión iniciada (mock), se debe mostrar/abrir el flujo de login/registro (`AuthPanel`) antes de continuar.
- El flujo de pago real está fuera de alcance en esta etapa (ver `PROJECT_SPEC.md`) — solo se implementa el gate de "requiere cuenta", no una pasarela de pago funcional.

## 7. Moneda

- El sitio muestra precios en **Quetzales (GTQ) o Dólares (USD)**, según selección del usuario mediante un selector visible.
- Todo componente que muestre precio (`ProductCard`, `CartItem`, página de producto) debe leer la moneda seleccionada desde un estado global, no manejarla de forma local por componente.

## 8. Idioma

- Español únicamente en esta etapa. No se implementa selector de idioma ni estructura i18n todavía, pero el texto no debe quedar hardcodeado de forma que bloquee agregarlo en el futuro (evitar texto dentro de imágenes).

## 9. Convención de rutas de producto

- `/producto/[slug]` usando un slug legible derivado del nombre del producto (ej. `/producto/rtx-5080`), nunca un ID numérico — decisión tomada por razones de SEO.

## 10. Wishlist / Favoritos

- Pospuesto a una fase futura. No implementar el ícono de corazón en `ProductCard` en esta etapa (ver `PROJECT_SPEC.md`).
