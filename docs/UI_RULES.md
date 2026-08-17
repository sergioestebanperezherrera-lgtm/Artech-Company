# UI_RULES — Artech

Este documento define **cómo se combinan** los tokens definidos en `DESIGN_SYSTEM.md` para construir la interfaz. Si buscas un valor de color/tipografía/radio exacto, consulta `DESIGN_SYSTEM.md` — aquí solo se referencian por nombre de token.

## 1. Patrón de contraste en capas (regla visual central del sitio)

Toda tarjeta de producto o categoría sigue esta estructura de capas, de afuera hacia adentro:

1. `bg-base` (fondo negro de la página, con partículas animadas de fondo en todo momento)
2. `surface-card` (tarjeta blanca, elevada con `shadow-card`)
3. `surface-card-inset` (contenedor interno negro, exclusivamente para alojar la imagen del producto)
4. La imagen del producto, flotando dentro de ese contenedor negro

Este patrón genera un efecto de "estudio fotográfico": el producto parece flotar en su propio espacio, y el contraste blanco/negro se repite en distintas escalas dentro de la misma tarjeta. **Es la regla visual más importante del proyecto y se aplica sin excepción a toda tarjeta que muestre un producto.**

## 2. Jerarquía de botones

| Contexto | Botón primario | Botón secundario |
|---|---|---|
| Fuera de una tarjeta (directamente sobre `bg-base`) | `btn-primary-on-dark` (blanco sobre negro) | `btn-outline-on-dark` |
| Dentro de una tarjeta blanca (`surface-card`) | `btn-primary-on-light` (negro sobre blanco) | `btn-outline-on-light` |
| Dentro de un panel oscuro sobre tarjeta blanca (ej. login) | `btn-primary-on-dark` (blanco sobre negro); al presionar (`:active`), invierte momentáneamente a negro sobre blanco como feedback táctil | — |

Regla general: el botón primario siempre usa el color de mayor contraste respecto a la superficie inmediata en la que está apoyado, nunca respecto al fondo general de la página.

## 3. Acento RGB — regla de uso

El degradado animado `accent-rgb` (ver `DESIGN_SYSTEM.md`) se usa **exclusivamente** como borde animado en tarjetas de producto de **tarjetas gráficas / productos con iluminación RGB**. No se usa en ningún otro tipo de producto ni en ningún otro elemento de la interfaz. Es la única excepción de color dentro de una paleta que, en el resto del sitio, es monocromática (negro/gris/blanco). Especificación de la animación en `ANIMATIONS.md`.

## 4. Grids de producto

| Contexto | Columnas desktop | Columnas mobile |
|---|---|---|
| Grid de categorías principales (Home) | 4 columnas × 2 filas | 2 columnas |
| Grid de productos (Novedades, Catálogo) | 4 columnas | 2 columnas |

Ver breakpoints exactos en `RESPONSIVE.md`.

## 5. Navbar — composición

Orden de elementos, de izquierda a derecha:

1. Logo (`λ` + "Artech")
2. Categorías de navegación (texto)
3. Bloque de íconos circulares, en este orden: **búsqueda → cuenta → carrito**

Comportamiento de cada ícono (detalle funcional en `UX_RULES.md` y `COMPONENTS.md`):
- Búsqueda: al hacer clic, se expande un campo de búsqueda con resultados en vivo.
- Cuenta: abre el flujo de login/registro (ver `COMPONENTS.md` → AuthPanel).
- Carrito: abre el drawer del carrito.

## 6. Composición del Home — orden de secciones

El orden de las secciones del Home es fijo y no debe alterarse sin actualizar este documento:

1. Navbar (fija/sticky)
2. Hero — un único producto protagonista, sin carrusel
3. Ofertas — carrusel (ver `COMPONENTS.md` → AutoScrollCarousel)
4. Categorías principales — grid
5. Novedades / Destacados — grid de `ProductCard`
6. Sección de confianza — 4 íconos (envío, garantía, soporte, pago seguro)
7. Footer

No se incluye una sección de "Marcas populares" en el Home (decisión explícita, para mantenerlo corto).

## 7. Página de producto — composición

1. Breadcrumb (Inicio > Categoría > Producto)
2. Galería de imagen (imagen grande + miniaturas debajo, estilo Apple) + info principal (nombre, precio, specs simples, botones de acción)
3. Botón "Más info" → expande tabla completa de especificaciones
4. Sección "También te puede interesar" (`AutoScrollCarousel` con `ProductCard`)
5. Footer

## 8. Login / Registro — composición visual

- Tarjeta blanca dividida en 2 mitades: un formulario a cada lado (Iniciar sesión / Crear cuenta), ambos presentes en el DOM simultáneamente.
- Un panel oscuro (`surface-panel-dark`) se superpone sobre una de las dos mitades, mostrando un mensaje de bienvenida + botón de acción para alternar de modo. El mecanismo de desliz está en `ANIMATIONS.md`.
- Círculos decorativos de línea fina (sin color, solo borde) en las esquinas del panel oscuro.
- **Alineación:** todo el contenido de cada formulario (logo+título, íconos sociales, campos, botón) está centrado dentro de su mitad, con un ancho máximo fijo. El texto dentro de los inputs permanece alineado a la izquierda (estándar de legibilidad).
- Cada formulario incluye 3 íconos circulares de acceso social (Facebook, X, Google) arriba de los campos, con separador de texto ("O con tu correo"). Sin funcionalidad real en esta etapa — ver `PROJECT_SPEC.md` sobre alcance de autenticación.
- Toda la pantalla vive centrada sobre `bg-base` con partículas.

## 9. Carrito — composición

- Panel lateral deslizable desde la derecha (drawer), minimalista.
- Contenido: lista de productos (imagen, nombre, precio, cantidad), subtotal, botón "Proceder al pago".
- **Sin** recomendaciones ni sección "también te puede interesar" dentro del carrito — es intencionalmente enfocado solo en revisar y pagar.

## 10. Panel de usuario — composición

1. Header: nombre de usuario, avatar/iniciales (placeholder), botón "Volver a la tienda"
2. Tarjetas de "Mis datos" (Nombre, Email) — editables, con label pequeño arriba del valor
3. "Mis Pedidos" — historial; estado vacío elegante mientras no hay backend (ver `UX_RULES.md`)
4. "Direcciones guardadas" — placeholder para fase de backend
5. Botón "Cerrar sesión" — sólido, `btn-primary-on-light`

Favoritos/Wishlist: fuera de alcance en esta etapa (ver `PROJECT_SPEC.md`).
