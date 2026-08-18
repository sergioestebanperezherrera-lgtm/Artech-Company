# UI_RULES - Artech

Este documento describe como se combinan los tokens de `DESIGN_SYSTEM.md` en la interfaz actual.

## 1. Principio Visual General

El fondo de ARTECH es negro global y continuo. Las secciones deben evitar backgrounds rectangulares innecesarios para que el ambiente visual se sienta como una sola experiencia. Las superficies importantes se elevan mediante Liquid Glass, bordes finos, sombras controladas y highlights localizados.

## 2. Reutilizacion de Componentes

- Si una pieza de UI ya existe como componente, debe reutilizarse.
- `ProductCard` se usa en catalogo, novedades y productos relacionados.
- `RgbLightingFrame` centraliza el borde RGB para GPUs compatibles.
- Las paginas de `app/` deben componer componentes y obtener datos desde services; no deben duplicar logica visual.

## 3. Jerarquia de Botones

| Contexto | Primario | Secundario |
|---|---|---|
| Sobre fondo oscuro | Blanco sobre negro | Outline sobre oscuro |
| Dentro de material claro | Negro sobre blanco | Outline sobre claro |
| Modales o drawers | El CTA de mayor contraste respecto a la superficie inmediata | Acciones secundarias con menor peso visual |

Todo boton importante debe tener feedback inmediato al click y estado `disabled` cuando una accion esta en curso.

## 4. Acento RGB

El degradado RGB se usa exclusivamente en productos GPU que tengan `hasRgbLighting: true`.

Aplica a:

- `ProductCard` de GPUs compatibles.
- Tarjeta de informacion de detalle de producto cuando el producto sea una GPU con RGB.

No debe aplicarse a otros productos ni convertirse en acento general de marca.

## 5. Navbar

La navbar usa el primer lenguaje Liquid Glass del proyecto:

1. Logo/isotipo + "Artech".
2. Navegacion por categorias.
3. Buscador.
4. Cuenta.
5. Carrito.

En mobile, las categorias pasan al menu hamburguesa y los accesos de cuenta/carrito permanecen disponibles.

## 6. Home

Orden actual de secciones:

1. Navbar global.
2. Hero de marca: isotipo + Artech, subtitulo, descripcion, CTAs y video de fondo.
3. Carrusel principal de ofertas.
4. Novedades / Productos destacados: una card protagonista y cuatro secundarias.
5. Explora ARTECH / categorias.
6. Seccion de confianza.
7. Footer global.

El carrusel de ofertas es protagonista comercial, pero no reemplaza el hero de identidad.

## 7. Catalogo

- Desktop: filtros como sidebar colapsable.
- Mobile: boton "Filtros" abre panel/drawer usable a pantalla completa.
- Los filtros soportan categoria, marca, precio y especificaciones dinamicas.
- Los resultados usan `ProductCard` y paginacion clasica.

## 8. Pagina de Producto

1. Breadcrumb.
2. Galeria + tarjeta de informacion principal.
3. Tabla de especificaciones.
4. Productos relacionados con `AutoScrollCarousel` y `ProductCard`.

La tarjeta principal de una GPU RGB reutiliza el mismo estilo de borde RGB que las cards de catalogo.

## 9. Login / Registro

- `AuthPanel` es un modal global.
- Desktop mantiene panel dividido.
- Mobile se adapta a una columna.
- Campos vacios por defecto, con placeholders y autocomplete correctos.
- Los accesos sociales son decorativos hasta que exista backend/OAuth.
- El cierre debe ser visible, accesible y funcionar con Escape.

## 10. Carrito

- El carrito existe como drawer global y pagina dedicada.
- Permite revisar, actualizar y eliminar productos.
- El checkout real no existe todavia.
- Si el usuario intenta comprar sin sesion mock, se abre `AuthPanel`.

## 11. Cuenta

El panel de cuenta muestra datos mock editables y estados vacios para pedidos/direcciones mientras no exista backend.
