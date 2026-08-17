# ARCHITECTURE — Artech

## 1. Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Routing por archivos alineado con el mapa del sitio (`PROJECT_SPEC.md`); preparado para SEO en páginas de producto; camino directo a agregar backend (API routes / server actions) sin migrar de framework |
| Estilos | **Tailwind CSS** | Permite mapear los tokens de `DESIGN_SYSTEM.md` como configuración reutilizable; acelera el desarrollo mobile-first |
| Estado global | **Zustand** | Carrito, moneda seleccionada, sesión mock — más liviano que Redux, suficiente para el alcance actual |
| Animaciones de UI | **Framer Motion** | Fade/slide-in en scroll, hover con volumen — buen soporte para animaciones disparadas por viewport y fácil de desactivar con `prefers-reduced-motion` |
| Fondo de partículas | **Canvas API nativo (vanilla, sin librería)** | Decisión explícita de mantener este efecto lo más ligero posible, sin dependencia externa |
| Carruseles | **Embla Carousel** | Ligero, excelente soporte táctil (crítico por el enfoque mobile-first), personalizable para el comportamiento de auto-scroll + pausa definido en `ANIMATIONS.md` |
| Utilidades | `clsx` + `tailwind-merge` | Manejo de clases condicionales (ej. estado "Agotado", variantes de botón) |

## 2. Estructura de carpetas

```
artech/
├── app/
│   ├── layout.tsx                  # Layout raíz: ParticlesBackground + Navbar + Footer envolviendo todas las páginas
│   ├── page.tsx                    # Home
│   ├── globals.css                 # Tokens de diseño como CSS variables
│   ├── catalogo/
│   │   └── page.tsx
│   ├── producto/
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── carrito/
│   │   └── page.tsx
│   └── cuenta/
│       └── page.tsx
│
├── components/
│   ├── ui/                         # Button, IconCircleButton, Badge, Card
│   ├── layout/                     # Navbar, Footer, ParticlesBackground, MobileMenu
│   ├── product/                    # ProductCard, ProductGallery, SpecsTable
│   ├── carousel/                   # AutoScrollCarousel
│   ├── catalog/                    # FilterPanel, Pagination
│   ├── cart/                       # CartDrawer, CartItem, CartSummary
│   ├── auth/                       # AuthPanel, SignInForm, SignUpForm
│   └── user/                       # UserProfileCard, OrdersEmptyState
│
├── lib/
│   ├── types/                      # Interfaces TypeScript (Product, Category, CartItem, User, Order)
│   ├── data/                       # Datos mock, con la misma forma que la futura API (ver API_CONTRACT.md)
│   ├── services/                   # Capa de acceso a datos — hoy lee de /data, mañana hace fetch real
│   └── utils/                      # formatPrice, slugify, etc.
│
└── public/
    └── placeholders/                # Espacio para logo, íconos de marca y fotos de producto del cliente
```

Ver el detalle de qué contiene cada componente en `COMPONENTS.md`.

## 3. Regla de separación: página vs. componente

- **Página** (`app/.../page.tsx`): solo compone. Decide qué secciones van y en qué orden, pasa datos a los componentes vía props. No contiene lógica visual propia ni estilos complejos.
- **Componente** (`components/`): contiene la lógica visual y de interacción. Si una pieza de UI aparece en más de un lugar, **es un componente**, nunca código duplicado dentro de una página.

Ejemplo: `ProductCard` se construye una sola vez y se usa en Home, Catálogo y página de producto (ver `COMPONENTS.md`). Si cambia el diseño de la tarjeta, se edita en un solo archivo.

## 4. Mapa de dependencias (orden de construcción)

```
Tokens de diseño (DESIGN_SYSTEM.md)
        │
        ▼
Átomos de UI (Button, IconCircleButton, Badge, Card)
        │
        ├──────────────┬─────────────────┐
        ▼              ▼                 ▼
ParticlesBackground   Navbar/Footer   ProductCard
        │              │                 │
        └──────┬───────┘                 │
               ▼                         ▼
        Layout global              AutoScrollCarousel
               │                         │
               └───────────┬─────────────┘
                            ▼
                    Home (ensambla todo)
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          Catálogo    Página Producto   Carrito
        (+ FilterPanel) (+ Gallery,      (+ CartDrawer)
                          SpecsTable)
                            │
                            ▼
                  Panel de Usuario / Login
```

`ProductCard` y `AutoScrollCarousel` son los componentes con más dependencias hacia adelante — se construyen y prueban temprano para no rehacerlos varias veces. Ver el orden completo por fases en `ROADMAP.md`.

## 5. Capa de datos — preparación para backend futuro

El proyecto no tiene backend en esta etapa, pero la capa de datos se estructura para que conectarlo después no requiera reescribir componentes:

1. **`lib/types/`** — define las interfaces con la forma exacta que tendría una respuesta de API real (ver `API_CONTRACT.md`).
2. **`lib/data/`** — archivos mock con la misma estructura que tendría el JSON de una API real.
3. **`lib/services/`** — capa intermedia (ej. `productService.getAll()`, `productService.getBySlug(slug)`) que hoy lee de `lib/data/` y en el futuro solo cambia su implementación interna a un `fetch`. **Los componentes llaman siempre a `lib/services/`, nunca directamente a los datos mock.**
4. **`useAuth()`** — hook aislado que hoy simula sesión (para el gate de "requiere cuenta" del carrito); mañana se conecta a autenticación real sin tocar los componentes que lo consumen.
5. **Estado del carrito (Zustand)** — hoy vive solo en memoria del navegador; mañana se sincroniza con backend cambiando solo la capa de persistencia, no la lógica de UI.
