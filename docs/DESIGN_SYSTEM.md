# DESIGN_SYSTEM — Artech

Este documento define los **tokens visuales** del proyecto: los valores atómicos reutilizables (colores, tipografía, iconografía, radios, sombras, espaciado). No describe cómo se combinan estos tokens en pantalla — para eso, ver `UI_RULES.md`. No describe movimiento — para eso, ver `ANIMATIONS.md`.

Todos estos valores deben implementarse como **variables/tokens en Tailwind config o CSS variables**, nunca hardcodeados repetidamente en componentes.

## 1. Paleta de colores

El sitio usa un **tema oscuro global**: el fondo negro es constante en todas las páginas (no alterna con blanco/gris por sección). El contraste se genera con tarjetas blancas sobre ese fondo negro.

| Token | Hex | Uso |
|---|---|---|
| `bg-base` | `#0A0A0A` | Fondo de **toda** la aplicación, en todas las páginas, con partículas animadas de fondo (ver `ANIMATIONS.md`) |
| `surface-card` | `#FFFFFF` | Superficie de tarjetas (producto, categoría, login, cualquier contenedor elevado) |
| `surface-card-inset` | `#0A0A0A` | Contenedor interno negro dentro de una tarjeta blanca, usado para alojar imágenes de producto (ver patrón de capas en `UI_RULES.md`) |
| `surface-panel-dark` | `#111111` | Paneles oscuros dentro de una tarjeta blanca (ej. panel de login que se desliza) |
| `text-primary-on-light` | `#111111` | Texto principal sobre superficies blancas |
| `text-secondary-on-light` | `#6E6E73` | Texto secundario sobre superficies blancas |
| `text-primary-on-dark` | `#FFFFFF` | Texto principal sobre el fondo negro |
| `text-secondary-on-dark` | `#A0A0A0` | Texto secundario sobre el fondo negro |
| `border-on-light` | `#D2D2D7` | Bordes sobre superficies blancas (inputs, separadores, botones outline dentro de tarjeta) |
| `border-on-dark` | `#2A2A2A` – `#3A3A3A` | Bordes sobre el fondo negro (navbar, botones outline fuera de tarjeta) |
| `particle-color` | `#8A8A8A` @ ~45% opacidad | Color de las partículas del fondo animado |
| `accent-rgb` | Degradado animado: `#FF3B3B → #3B82F6 → #A855F7 → #22D3EE` | Exclusivo para el borde animado de tarjetas de producto con iluminación RGB (GPU). Ver regla de uso en `UI_RULES.md` |

**Regla de contraste de botones** (valores; la regla de cuándo usar cada uno vive en `UI_RULES.md`):

| Token | Fondo | Texto |
|---|---|---|
| `btn-primary-on-dark` | `#FFFFFF` | `#0A0A0A` |
| `btn-primary-on-light` | `#111111` | `#FFFFFF` |
| `btn-outline-on-dark` | transparente, borde `#3A3A3A` | `#FFFFFF` |
| `btn-outline-on-light` | transparente, borde `#D2D2D7` | `#111111` |

## 2. Tipografía

- **Familia tipográfica única para todo el sitio:** **Inter**. Se eligió por su soporte completo de acentos y ñ (necesario para español), rango de pesos 300–700, y mejor integración/documentación en el ecosistema Next.js + Tailwind.
- **Uso de pesos:**
  - Títulos grandes (Hero, encabezados de sección): peso 500.
  - Cuerpo de texto: peso 400.
  - Texto secundario/descripciones: peso 400, color `text-secondary-*`.
  - Precios y CTAs: peso 500.
- **Tipografía monoespaciada (opcional, secundaria):** JetBrains Mono o Space Mono, reservada exclusivamente para especificaciones técnicas de producto (ej. "16GB GDDR7 · 256-bit"), nunca para texto de marca o UI general.

## 3. Iconografía

- **Estilo:** línea fina (stroke), grosor 1.5px, esquinas suavemente redondeadas — familia de referencia: Lucide o Phosphor (stroke, no filled).
- **Color:** los íconos heredan el color de texto de su contexto (blanco sobre negro, negro/gris sobre blanco). Nunca tienen color propio, excepto los íconos de marcas sociales en login (Facebook, X, Google), que se muestran en su color de marca estándar solo dentro de su ícono circular.
- **Botón de ícono circular** (usado en navbar para búsqueda/cuenta/carrito, y en accesos sociales del login):
  - Tamaño: `32px × 32px` (navbar) / `28px × 28px` (accesos sociales en login, más compacto).
  - Forma: círculo perfecto, borde `0.5px` con el color de borde correspondiente al fondo (`border-on-dark` o `border-on-light`).
  - Ícono centrado dentro, tamaño ~13–15px.

## 4. Radios de borde

| Token | Valor | Uso |
|---|---|---|
| `radius-card` | `12px`–`14px` | Tarjetas de producto, categoría, contenedores de sección |
| `radius-card-large` | `16px`–`18px` | Tarjetas grandes (login, modales) |
| `radius-pill` | `20px`–`24px` | Botones (forma píldora/cápsula) |
| `radius-input` | `8px` | Campos de formulario |
| `radius-image-inset` | `8px`–`10px` | Contenedor interno de imagen dentro de una tarjeta |

## 5. Sombras

| Token | Valor | Uso |
|---|---|---|
| `shadow-card` | `0 8px 24px rgba(0,0,0,0.4)` | Tarjetas de producto/categoría en reposo sobre el fondo negro |
| `shadow-card-elevated` | `0 10px 30px rgba(0,0,0,0.5)` a `0 16px 32px rgba(0,0,0,0.5)` | Estado hover de tarjeta de producto (ver `ANIMATIONS.md` para el detalle de la transición) |
| `shadow-modal` | `0 20px 50px rgba(0,0,0,0.5)` a `0 20px 50px rgba(0,0,0,0.6)` | Modales (login) y drawers elevados |

## 6. Espaciado

Usar la escala de espaciado estándar de Tailwind CSS (base 4px: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64...) como convención del proyecto. No se definieron valores custom fuera de esta escala; cualquier separación entre elementos debe redondearse al valor de la escala más cercano.
