# ROADMAP — Artech

Fases de implementación, en **orden obligatorio** — cada fase depende de que la anterior esté resuelta (ver mapa de dependencias en `ARCHITECTURE.md`). No saltar fases.

### Fase 0 — Fundación del proyecto
- Setup de Next.js + TypeScript + Tailwind.
- Configurar los tokens de `DESIGN_SYSTEM.md` en `globals.css` / `tailwind.config`.
- Crear la estructura de carpetas vacía (`ARCHITECTURE.md` sección 2).
- Configurar la tipografía Inter.

### Fase 1 — Átomos de UI
- Construir `Button` (todas sus variantes), `IconCircleButton`, `Badge`, `Card` (ver `COMPONENTS.md`).
- Probar cada átomo en mobile y desktop desde el inicio.
- Por qué primero: todo lo demás se construye sobre estos átomos.

### Fase 2 — Layout global
- `ParticlesBackground` (ver `ANIMATIONS.md` sección 1).
- `Navbar` (con buscador expandible, íconos cuenta/carrito) + `MobileMenu`.
- `Footer`.
- Ensamblar `app/layout.tsx` para que envuelvan todas las páginas desde ya.

### Fase 3 — ProductCard
- Construir con datos mock, aplicando el patrón de capas (`UI_RULES.md` sección 1), specs cortas, precio, los dos botones, estado "Agotado" (`UX_RULES.md`).
- Probar en grid de 4 columnas (desktop) y 2 columnas (mobile) desde el inicio.

### Fase 4 — AutoScrollCarousel
- Construir sobre Embla Carousel según el comportamiento exacto de `ANIMATIONS.md` sección 4.
- Probar con `ProductCard` real dentro.

### Fase 5 — Home completo
- Ensamblar todas las secciones en el orden fijo de `UI_RULES.md` sección 6, usando los componentes de las fases 1–4.
- Resolver aquí el ajuste fino de responsive — es la página más compleja del sitio.

### Fase 6 — Catálogo
- `FilterPanel` (desktop sidebar / mobile bottom sheet, `RESPONSIVE.md`) y `Pagination`.
- Grid de `ProductCard` conectado a filtros sobre datos mock.

### Fase 7 — Página de producto
- `ProductGallery`, `SpecsTable` (simple + expandible).
- Sección "También te puede interesar" reutilizando `AutoScrollCarousel`.

### Fase 8 — Login / Registro
- `AuthPanel` con la mecánica de panel deslizante (`UI_RULES.md` sección 8, `ANIMATIONS.md` sección 6).
- Accesos sociales decorativos (Facebook, X, Google).

### Fase 9 — Carrito
- `CartDrawer`, `CartItem`, `CartSummary`.
- Conectar al store de Zustand.
- Implementar el gate de "requiere cuenta" (`UX_RULES.md` sección 6), enlazando con `AuthPanel` de la Fase 8.

### Fase 10 — Panel de usuario
- `UserProfileCard`, `OrdersEmptyState`.
- Estructura lista para "Direcciones guardadas" (placeholder de backend futuro).

### Fase 11 — Pulido final
- Microinteracciones: hover 3D en tarjetas, borde RGB animado en GPU (`ANIMATIONS.md`).
- Auditoría de accesibilidad: contraste, estados de foco visibles, `prefers-reduced-motion` respetado.
- Auditoría de performance: lazy-loading de imágenes, rendimiento del canvas de partículas en mobile de gama baja.
- QA responsive completo en los breakpoints de `RESPONSIVE.md`.

---

## Resumen — por qué este orden

1. **Átomos de UI** → todo depende de ellos.
2. **ParticlesBackground + Navbar/Footer** → presentes en cada página, se resuelven una vez.
3. **ProductCard + AutoScrollCarousel** → los componentes más reutilizados; construirlos bien temprano evita rehacerlos.
4. **Home** → la página más compleja, sirve de prueba de fuego del sistema completo.
5. **Catálogo → Producto → Login → Carrito → Panel de usuario** → cada uno depende de piezas ya construidas en las fases anteriores (el Carrito depende de `AuthPanel` para el gate de autenticación, por eso Login va antes).
