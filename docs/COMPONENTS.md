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
Selector preparado para moneda global. Actualmente expone solo GTQ porque la API devuelve `priceUSD: null` y no existe politica de conversion.

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
Selector de imagen principal y miniaturas. Actualmente presenta placeholders textuales en detalle aunque recibe las rutas de imagen; la integracion visual de esos assets sigue pendiente.

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
Modal de login/registro conectado a la API real. Incluye cierre con Escape, bloqueo de scroll, focus trap, validaciones visibles, estados de carga y boton para mostrar/ocultar contrasena.

El acceso con Google inicia el flujo OAuth real del backend. No se almacenan tokens de autenticacion en `localStorage`.

## `components/user/`

### `AccountView`
Vista de cuenta basada en la sesion real. Permite iniciar sesion, continuar con Google, consultar identidad y cerrar sesion.

### `UserProfileCard`
Muestra nombre y email del usuario autenticado en modo lectura. La edicion de perfil no esta implementada.

### `OrdersEmptyState`
Estado vacio mientras no existe un modulo operativo de pedidos.

## `components/motion/`

### `ScrollReveal`
Wrapper para reveals al entrar al viewport. Debe respetar `prefers-reduced-motion`.
