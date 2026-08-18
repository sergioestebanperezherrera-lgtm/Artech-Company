# RESPONSIVE - Artech

El frontend esta construido mobile-first y debe conservar buena legibilidad en mobile, tablet y desktop.

## Breakpoints

| Nombre | Rango | Convencion |
|---|---|---|
| Mobile | `< 640px` | Tailwind `sm` como limite inferior |
| Tablet | `640px - 1024px` | Tailwind `md` / `lg` |
| Desktop | `> 1024px` | Tailwind `lg+` |

No se usan breakpoints custom como regla general.

## Comportamiento Por Seccion

| Seccion | Desktop | Mobile |
|---|---|---|
| Navbar | Logo, categorias, buscador, cuenta y carrito visibles | Menu hamburguesa para categorias; cuenta/carrito siguen accesibles |
| Hero | Video completo con contenido a la izquierda | Video reposicionado para legibilidad; gradiente local detras del texto |
| Carrusel de ofertas | Card horizontal grande con texto e imagen | Misma estructura adaptada a ancho movil y controles tactiles |
| Productos destacados | Card protagonista + cuatro secundarias | Mantiene jerarquia con distribucion legible |
| Grid de categorias | Varias columnas | 2 columnas o layout compacto segun ancho |
| Catalogo | Filtros en sidebar + grid | Boton "Filtros" abre panel/drawer a pantalla completa |
| ProductCard | Grid amplio | Evitar overflow de texto, precio y botones |
| Login / Registro | Modal con panel dividido | Una columna usable, cierre visible y scroll controlado |
| Carrito | Drawer lateral | Drawer ancho completo o casi completo |
| Footer | Columnas | Columnas apiladas |

## Reglas Generales

- Los inputs en mobile deben tener `font-size >= 16px`.
- Ningun texto, precio, boton o input debe salirse de su contenedor.
- Evitar scroll horizontal.
- El video del hero debe mantener identidad visual sin invadir el texto.
- Efectos pesados pueden reducirse en mobile si no alteran la experiencia principal.
- Respetar `prefers-reduced-motion` en todos los breakpoints.
