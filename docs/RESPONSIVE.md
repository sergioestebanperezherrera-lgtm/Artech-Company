# RESPONSIVE — Artech

## Prioridad del proyecto

**Mobile-first, crítico.** El sitio debe diseñarse y construirse con la misma calidad en mobile que en desktop desde la primera versión del frontend — no es un ajuste posterior, es un requisito desde la Fase 0 del `ROADMAP.md`.

## Breakpoints

| Nombre | Rango | Convención |
|---|---|---|
| Mobile | `< 640px` | Estándar Tailwind (`sm` como límite inferior) |
| Tablet | `640px – 1024px` | Estándar Tailwind (`md`/`lg`) |
| Desktop | `> 1024px` | Estándar Tailwind (`lg`+) |

No se definieron breakpoints custom — usar la escala por defecto de Tailwind CSS.

## Comportamiento por sección

| Sección | Desktop | Mobile |
|---|---|---|
| Navbar | Logo + categorías en texto + 3 íconos circulares, todo visible | Colapsa a menú hamburguesa; íconos de cuenta y carrito permanecen siempre visibles fuera del menú |
| Grid de categorías (Home) | 4 columnas × 2 filas | 2 columnas |
| Grid de productos (Novedades, Catálogo) | 4 columnas | 2 columnas |
| Filtros del Catálogo | Panel lateral izquierdo, tipo Amazon, colapsable/expandible | Colapsan a un botón "Filtros" que abre un **panel inferior (bottom sheet) a pantalla completa** |
| Carruseles (Ofertas, Novedades, relacionados) | Múltiples tarjetas visibles + flechas | Igual comportamiento (auto-scroll + pausa + flechas), ajustando el ancho de tarjeta visible; buen soporte táctil es obligatorio (ver elección de librería en `ARCHITECTURE.md`) |
| Login / Registro (panel dividido) | Ambas mitades visibles lado a lado dentro de la tarjeta | Debe adaptarse a una sola columna visible por vez, manteniendo la lógica de "panel que se desliza" pero ajustando el layout para que no se vean ambas mitades comprimidas — evaluar en implementación si se apila verticalmente o se mantiene el ancho de tarjeta reducido con scroll horizontal deshabilitado |
| Carrito (drawer) | Panel lateral de ancho fijo (~280–320px) | Panel lateral a ancho completo o casi completo de la pantalla |

## Regla general

Cualquier componente nuevo que no esté explícitamente cubierto en esta tabla debe diseñarse mobile-first por defecto: primero la versión mobile, luego se expande para tablet/desktop — nunca al revés.
