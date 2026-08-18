# COMPONENTS - Artech

Inventario de componentes principales del frontend. Este documento describe responsabilidad y uso; los valores visuales estan en `DESIGN_SYSTEM.md` y las reglas de composicion en `UI_RULES.md`.

## `components/ui/`

### `Button`
Boton reutilizable con variantes para fondos oscuros y claros. Incluye estados de feedback, loading/disabled cuando corresponde y soporte de foco visible.

### `IconCircleButton`
Boton circular con icono centrado. Se usa en navbar, controles de carrusel, cierre de modales/drawers y acciones compactas.

### `Badge`
Etiqueta pequena para descuentos y estados como "Agotado".

### `Card`
Wrapper base para superficies elevadas reutilizables.

## `components/brand/`

### `LogoMark`
Isotipo reutilizable de ARTECH. Se usa como parte de la identidad visual en navbar, hero, footer y favicon cuando corresponda.

## `components/layout/`

### `Navbar`
Navegacion global con logo, categorias, buscador, cuenta y carrito. En mobile delega categorias al menu movil.

### `MobileMenu`
Menu responsive para navegacion de categorias y enlaces principales en pantallas pequenas.

### `Footer`
Footer global con marca, enlaces de tienda/soporte, newsletter y redes sociales. Las redes sin URL oficial definida deben quedar marcadas como pendientes, no como links muertos.

### `GlobalOverlays`
Coordina overlays globales como carrito y autenticacion para que puedan abrirse desde cualquier pagina.

## `components/home/`

### `BrandHeroSection`
Hero principal de marca. Contiene video de fondo, isotipo, titulo, subtitulo, descripcion y CTAs.

### `HeroVideoBackground`
Video local del hero con autoplay, muted, loop seamless mediante asset ping-pong, `playsInline`, poster y pausa cuando sale del viewport.

### `HeroSection`
Carrusel principal de ofertas. Usa Embla, autoplay y controles manuales.

### `FeaturedProductsShowcase`
Seccion de novedades/productos destacados con una card protagonista y cuatro secundarias.

### `CategoryGrid`
Grid de categorias principales.

### `TrustSection`
Bloque de confianza: envio, garantia, soporte y pago seguro.

### `CurrencySelector`
Selector de moneda para GTQ/USD.

## `components/product/`

### `ProductCard`
Card reutilizable para productos en catalogo, novedades y relacionados. La imagen, nombre y area principal navegan a detalle; "Anadir al carrito" es una accion separada.

Incluye:

- Imagen mediante `ProductImage`.
- Nombre, specs cortas y precio.
- Boton "Mas informacion".
- Boton "Anadir al carrito".
- Estado agotado.
- Borde RGB cuando `hasRgbLighting` sea `true`.

### `RgbLightingFrame`
Wrapper reutilizable para el borde RGB animado. Debe usarse solo en GPUs compatibles.

### `ProductImage`
Componente de imagen de producto con fallback y carga apropiada.

### `ProductDetailView`
Vista principal de detalle: galeria, informacion, specs y relacionados.

### `ProductGallery`
Galeria con imagen principal y miniaturas.

### `SpecsTable`
Tabla de especificaciones con comportamiento expandible cuando aplica.

## `components/carousel/`

### `AutoScrollCarousel`
Carrusel reutilizable para secciones de productos relacionados u otros listados horizontales. Comparte patron de controles, loop y reduced motion.

## `components/catalog/`

### `CatalogView`
Vista completa de catalogo: filtros, resultados, paginacion y estados vacios.

### `FilterPanel`
Filtros por categoria, marca, precio y specs dinamicas. En mobile se muestra dentro de un drawer/panel.

### `Pagination`
Paginacion clasica para resultados del catalogo.

## `components/cart/`

### `CartDrawer`
Drawer global del carrito con lista de productos, resumen y gate de autenticacion para comprar.

### `CartPageView`
Vista de pagina dedicada del carrito.

### `CartItem`
Fila de producto dentro del carrito.

### `CartSummary`
Resumen de subtotal y acciones principales.

## `components/auth/`

### `AuthPanel`
Modal de login/registro con sesion mock. Incluye cierre con Escape, bloqueo de scroll, focus trap, validaciones visibles y boton para mostrar/ocultar contrasena.

Los accesos sociales son decorativos mientras no exista backend/OAuth.

## `components/user/`

### `AccountView`
Vista del panel de usuario.

### `UserProfileCard`
Datos mock de usuario editables localmente.

### `OrdersEmptyState`
Estado vacio para pedidos mientras no existe backend.

## `components/motion/`

### `ScrollReveal`
Wrapper para reveals al entrar al viewport. Debe respetar `prefers-reduced-motion`.
