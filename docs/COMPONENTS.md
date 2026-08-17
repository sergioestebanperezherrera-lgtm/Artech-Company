# COMPONENTS — Artech

Inventario de todos los componentes del proyecto. Cada componente tiene una única responsabilidad y debe construirse **una sola vez** y reutilizarse — nunca duplicar su lógica en distintas páginas (ver regla de separación en `ARCHITECTURE.md`).

Los valores visuales exactos (color, tipografía) están en `DESIGN_SYSTEM.md`. Las reglas de composición están en `UI_RULES.md`. Las animaciones están en `ANIMATIONS.md`. Este documento describe **qué hace cada componente y qué necesita para funcionar**, no su apariencia final.

---

## `components/ui/` — Átomos

### `Button`
Botón reutilizable con variantes: `primary-on-dark`, `primary-on-light`, `outline-on-dark`, `outline-on-light` (ver `UI_RULES.md` sección 2 para cuándo usar cada una). Props esperadas: `variant`, `children`, `onClick`, `disabled`.

### `IconCircleButton`
Botón circular con ícono centrado, usado en navbar (búsqueda, cuenta, carrito) y en accesos sociales del login. Props: `icon`, `size` (32px navbar / 28px social), `onClick`.

### `Badge`
Etiqueta pequeña con dos variantes: descuento (ej. "-20%") y estado "Agotado". Props: `variant` (`discount` | `outOfStock`), `label`.

### `Card`
Wrapper genérico que aplica `surface-card`, `radius-card` y `shadow-card` — base de la que heredan `ProductCard` y otros contenedores elevados.

---

## `components/layout/` — Estructura global

### `ParticlesBackground`
Canvas animado de fondo, presente en el layout raíz de la aplicación (envuelve todas las páginas). Ver especificación completa en `ANIMATIONS.md` sección 1.

### `Navbar`
Barra de navegación fija/sticky. Contiene: logo, categorías, `IconCircleButton` de búsqueda (expande campo con resultados en vivo), `IconCircleButton` de cuenta (abre `AuthPanel`), `IconCircleButton` de carrito (abre `CartDrawer`). Composición exacta en `UI_RULES.md` sección 5. Comportamiento mobile en `RESPONSIVE.md`.

### `MobileMenu`
Menú hamburguesa que reemplaza la navegación de categorías en mobile.

### `Footer`
Pie de página: logo, links (Tienda, Soporte, Newsletter), redes sociales, copyright. Presente en todas las páginas.

---

## `components/product/` — Producto

### `ProductCard`
**El componente más reutilizado del sitio.** Usado en: Ofertas (Home), Novedades (Home), grid del Catálogo, "También te puede interesar" (página de producto). Sigue el patrón de capas descrito en `UI_RULES.md` sección 1.

Contenido: imagen (dentro de contenedor negro interno), nombre, especificaciones cortas (2–3 líneas), precio, botón "Más información" (outline), botón "Añadir al carrito" (primario). Estado especial: producto sin stock → tarjeta con opacidad reducida, `Badge` "Agotado", botón "Añadir al carrito" deshabilitado (ver `UX_RULES.md`).

Variante especial: si el producto es una tarjeta gráfica / tiene iluminación RGB, aplica el borde animado `accent-rgb` (ver `ANIMATIONS.md` sección 5 y regla de uso en `UI_RULES.md` sección 3).

### `ProductGallery`
Usado solo en la página de producto. Imagen grande protagonista + miniaturas debajo para cambiar de ángulo (estilo Apple), con leve zoom/rotación al hover.

### `SpecsTable`
Tabla simple (spec: valor) visible por defecto; un botón "Más info" la expande a la lista completa de especificaciones.

---

## `components/carousel/` — Carruseles

### `AutoScrollCarousel`
Componente genérico reutilizado en: Ofertas (Home), Novedades destacadas si se muestran en carrusel, secciones de marca/categoría (Catálogo), "También te puede interesar" (página de producto). Comportamiento exacto (auto-avance, pausa al mantener presionado, flechas, loop) en `ANIMATIONS.md` sección 4. Recibe una lista de `ProductCard` (u otro contenido) como children/prop.

---

## `components/catalog/` — Catálogo

### `FilterPanel`
Panel de filtros tipo Amazon: categoría, marca, precio, especificaciones técnicas dinámicas según el tipo de producto. Desktop: sidebar colapsable. Mobile: bottom sheet a pantalla completa (ver `RESPONSIVE.md`).

### `Pagination`
Paginación clásica (1, 2, 3...) para los resultados del catálogo — no scroll infinito, no botón "cargar más".

---

## `components/cart/` — Carrito

### `CartDrawer`
Panel lateral deslizable desde la derecha. Contiene `CartItem` (lista), `CartSummary` (subtotal + botón "Proceder al pago"). Minimalista, sin recomendaciones (ver `UI_RULES.md` sección 9). Al intentar proceder al pago sin sesión iniciada, dispara el gate de autenticación (ver `UX_RULES.md`).

### `CartItem`
Fila individual dentro del drawer: imagen pequeña, nombre, precio, cantidad, opción de eliminar.

### `CartSummary`
Subtotal y botón de acción principal del carrito.

---

## `components/auth/` — Autenticación (mock, sin backend real)

### `AuthPanel`
Componente de login/registro con panel dividido deslizante (ver mecánica completa en `UI_RULES.md` sección 8 y animación en `ANIMATIONS.md` sección 6). Contiene dos formularios (`SignInForm`, `SignUpForm`) coexistiendo, y el panel oscuro superpuesto con el mensaje/botón de alternancia.

Incluye 3 `IconCircleButton` de acceso social (Facebook, X, Google) por formulario — decorativos, sin lógica de autenticación real en esta etapa (ver `PROJECT_SPEC.md`).

---

## `components/user/` — Panel de usuario

### `UserProfileCard`
Tarjetas de "Mis datos" (Nombre, Email), editables.

### `OrdersEmptyState`
Estado vacío elegante para "Mis Pedidos" mientras no existe backend — mensaje + ícono de línea, nunca un mensaje de error técnico (ver `UX_RULES.md`).
