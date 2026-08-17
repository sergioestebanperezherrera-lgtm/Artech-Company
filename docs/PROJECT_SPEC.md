# PROJECT_SPEC — Artech

## 1. Qué es Artech

Artech es un e-commerce de electrónica y tecnología. El nombre combina **"Arte"** (dinamismo, evolución hacia el futuro) + **"Tech"** (tecnología).

- **Logo:** símbolo **λ (lambda)** + wordmark "Artech". La lambda es parte definitiva de la identidad de marca, no un placeholder.
- **Personalidad de marca:** minimalista premium, inspirada en Apple / Samsung. Transmite tecnología, elegancia, calidad y modernidad, sin sentirse exclusiva ni intimidante — debe ser accesible para cualquier usuario.

## 2. Qué vende

Electrónica y tecnología en general, con foco principal en:

- Celulares
- Tarjetas gráficas (GPU)
- Memoria RAM
- Procesadores (CPU)
- Monitores

Categorías secundarias: Periféricos, Componentes, Consolas, Accesorios (auriculares, etc.).

No es una tienda "gamer nicho" — es una tienda de tecnología general con un catálogo fuerte en componentes de PC.

## 3. Audiencia

Consumidores generales interesados en tecnología — no exclusivamente gamers ni exclusivamente profesionales. La experiencia debe sentirse tan cómoda para alguien comprando un celular como para alguien comprando una tarjeta gráfica.

## 4. Alcance de esta etapa

**En esta etapa se construye el frontend completo.** Reglas de alcance:

| Incluido en esta etapa | Fuera de alcance (fase futura) |
|---|---|
| Todas las páginas y componentes visuales | Backend real, base de datos |
| Interacciones de UI (carritos, filtros, login visual) | Autenticación real (login funcional) |
| Datos de producto simulados (mock) | Pasarela de pago real |
| Estructura de datos preparada para conectar a una API futura | Reseñas y calificaciones de usuarios |
| — | Favoritos / Wishlist |
| — | Multi-idioma (i18n) |
| — | Blog, comparador de productos, programa de referidos (ideas abiertas, no definidas) |

El login/registro, el carrito y el panel de usuario se construyen **visual y funcionalmente en el frontend** (estado local, mock), pero sin conexión real a un backend de autenticación o pagos. Ver `API_CONTRACT.md` para la forma de datos que debe respetar esta capa mock, de modo que conectar el backend real más adelante no requiera rediseñar componentes.

## 5. Mapa del sitio

| Ruta | Página |
|---|---|
| `/` | Home |
| `/catalogo` | Catálogo (con filtros y paginación) |
| `/producto/[slug]` | Página de producto individual |
| `/carrito` | Carrito (también accesible como drawer global desde cualquier página) |
| `/cuenta` | Panel de usuario (requiere sesión mock) |
| Login / Registro | Modal o pantalla propia, accesible desde el ícono de cuenta en el navbar (ver `COMPONENTS.md`) |

Convención de rutas de producto: **slug legible**, ej. `/producto/rtx-5080` (nunca ID numérico, por SEO).

## 6. Reglas de negocio no negociables

- **Moneda:** el sitio soporta **Quetzales (GTQ) y Dólares (USD)**, con un selector que permite al usuario cambiar entre ambas. Todo componente que muestre precio debe considerar esta dualidad desde el diseño de datos (ver `API_CONTRACT.md`).
- **Idioma:** español únicamente en esta etapa. No implementar i18n todavía, pero tampoco hardcodear texto de forma que bloquee agregarlo después (evitar texto embebido en imágenes, por ejemplo).
- **Regla de assets — NO NEGOCIABLE:** ningún logo, imagen de producto, ícono de marca o foto se genera ni se descarga de internet durante el desarrollo. Todo el código debe incluir **espacios reservados (placeholders) claramente marcados** (ej. comentario `{/* LOGO AQUÍ: reemplazar con archivo del cliente */}` o nombre de archivo esperado `[IMAGEN PRODUCTO: nombre-producto.png]`) para que el dueño del proyecto suba sus propios archivos manualmente. Esto aplica a: logo, íconos de marcas (Apple, NVIDIA, etc.), y todas las fotos de producto.
- **Recomendación de formato de imagen de producto:** el proyecto asume que las fotos de producto vendrán con fondo negro o transparente, para integrarse sin bordes visibles dentro del patrón de tarjeta definido en `UI_RULES.md`.
