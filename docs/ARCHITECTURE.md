# ARCHITECTURE - Artech

## 1. Stack Tecnologico

| Capa | Tecnologia | Uso |
|---|---|---|
| Framework | Next.js App Router + React | Rutas, paginas, layout global y renderizado |
| Lenguaje | TypeScript | Tipado de componentes, datos y stores |
| Estilos | Tailwind CSS + CSS variables | Tokens, responsive, Liquid Glass y animaciones CSS |
| Estado global | Zustand + persist middleware | Carrito, moneda y sesion mock |
| Carruseles | Embla Carousel | Carrusel de ofertas y carruseles reutilizables |
| Iconos | Lucide React | Iconografia de linea |
| QA funcional | Playwright | Pruebas E2E basicas |

No hay backend implementado en esta etapa.

## 2. Estructura de Carpetas

```text
artech/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── catalogo/page.tsx
│   ├── producto/[slug]/page.tsx
│   ├── carrito/page.tsx
│   └── cuenta/page.tsx
├── components/
│   ├── auth/
│   ├── brand/
│   ├── carousel/
│   ├── cart/
│   ├── catalog/
│   ├── home/
│   ├── layout/
│   ├── motion/
│   ├── product/
│   ├── ui/
│   └── user/
├── lib/
│   ├── data/
│   ├── services/
│   ├── stores/
│   ├── types/
│   └── utils/
├── public/
│   ├── assets/
│   ├── videos/
│   └── favicon.svg
├── tests/
└── docs/
```

## 3. Separacion Pagina / Componente

- Las paginas de `app/` componen vistas, consultan services y pasan props.
- Los componentes de `components/` contienen la UI reutilizable y la logica de interaccion.
- Si una pieza aparece en mas de una pantalla, debe vivir como componente compartido.

Ejemplo: `ProductCard` se usa en Home, catalogo y productos relacionados; cualquier cambio de comportamiento comun debe hacerse ahi.

## 4. Capa de Datos

El proyecto usa datos mock, pero organizados para poder reemplazarse por API real:

1. `lib/types/`: modelos TypeScript.
2. `lib/data/`: productos, categorias y marcas mock.
3. `lib/services/`: capa de acceso a datos. Los componentes deben consumir services, no importar directamente `lib/data/`.
4. `lib/stores/`: estado global de carrito, moneda y sesion mock.
5. `lib/utils/`: utilidades como formato de precios, busqueda y clases.

Cuando exista backend, el cambio principal deberia concentrarse en `lib/services/` y en la capa de autenticacion/persistencia, no en las cards o pantallas.

## 5. Persistencia Local

Actualmente se persiste en `localStorage` mediante Zustand:

- Carrito.
- Moneda seleccionada.
- Sesion mock.

Esta persistencia es local y temporal. No representa autenticacion real ni sincronizacion con servidor.

## 6. Layout Global

`app/layout.tsx` monta la estructura global. La UI transversal se concentra en:

- `Navbar`
- `Footer`
- `GlobalOverlays`
- `CartDrawer`
- `AuthPanel`

`GlobalOverlays` permite abrir carrito y autenticacion desde distintas rutas sin duplicar modales.

## 7. Movimiento y Fondos

- El hero usa `HeroVideoBackground` con video local en `public/videos/`.
- Los reveals se gestionan mediante `ScrollReveal` y CSS.
- El fondo ambiental y el material Liquid Glass viven principalmente en `globals.css`.
- Las animaciones decorativas deben respetar `prefers-reduced-motion`.

## 8. Convenciones Tecnicas

- Usar tokens CSS/Tailwind en lugar de valores visuales hardcodeados repetidamente.
- Mantener TypeScript estricto en props y modelos.
- Mantener texto visible en espanol.
- Mantener nombres de archivos, variables y funciones en ingles.
- No introducir backend, OAuth, pagos o datos reales sin actualizar primero el alcance y `API_CONTRACT.md`.
