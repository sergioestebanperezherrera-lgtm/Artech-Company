# ANIMATIONS - Artech

ARTECH usa movimiento sutil y coordinado. La experiencia debe sentirse premium y rapida: las animaciones acompanan la lectura, no reemplazan la funcionalidad.

Toda animacion decorativa debe respetar `prefers-reduced-motion`.

## 1. Hero Video Background

El hero principal usa un video local como fondo visual definitivo:

- Archivo principal: `public/videos/artech-hero-background-pingpong.mp4`.
- Poster: `public/videos/artech-hero-poster.jpg`.
- Atributos esperados: `autoplay`, `muted`, `loop`, `playsInline`, sin controles.
- Debe quedar detras de toda la UI y no bloquear clicks.
- Se pausa o reduce actividad cuando el hero esta fuera del viewport.
- En `prefers-reduced-motion`, se evita animacion compleja y se prioriza poster/estado estable.

La entrada del video se materializa desde negro con opacidad, escala, brillo y blur controlados. Despues continua reproduciendose normalmente.

## 2. Fondo Ambiental Global

El resto de la pagina mantiene continuidad visual con el hero mediante halos, trails y gradientes monocromaticos muy sutiles en CSS. No debe sentirse como secciones rectangulares independientes.

Intensidad recomendada:

- Hero: maxima presencia visual.
- Contenido: 10% a 30% de intensidad.
- Footer: retorno gradual a negro profundo.

## 3. Reveals al Scroll

`ScrollReveal` activa entradas suaves cuando el contenido entra al viewport:

- Propiedades principales: `opacity`, `transform`, blur ligero y masks cuando corresponda.
- Desplazamientos pequenos.
- Stagger relajado en grupos de cards.
- Evitar animar layout (`top`, `left`, `width`, `height`) durante scroll.

## 4. Carrusel de Ofertas

El carrusel principal usa Embla Carousel:

- Autoplay cada 4.5 segundos aproximadamente.
- No debe pausarse por hover.
- Flechas e indicadores permiten control manual.
- Tras interaccion manual, el autoplay se reinicia de forma razonable.
- En `prefers-reduced-motion`, reducir transicion y priorizar control manual.

## 5. AutoScrollCarousel Reutilizable

Para carruseles secundarios:

- Loop cuando haya suficientes elementos.
- Transicion suave entre slides.
- Controles manuales accesibles.
- Evitar saltos bruscos o timers sin cleanup.

## 6. ProductCard

Hover:

- Elevacion o highlight sutil.
- Imagen con scale maximo cercano a `1.02`.
- CTA con mayor contraste.
- Sin rebotes ni tilt exagerado.

La accion de click debe dar feedback desde el primer frame.

## 7. Borde RGB

El borde RGB se usa solo en GPUs con `hasRgbLighting: true`.

- Implementacion: borde con degradado conico animado.
- Giro 360 grados continuo.
- Velocidad constante.
- Glow controlado.
- En reduced motion, conservar el borde sin animacion continua.

## 8. AuthPanel

El modal de autenticacion:

- Aparece con overlay oscuro y blur del fondo.
- La card entra con opacidad, `translateY` pequeno y scale leve.
- Duracion aproximada: 450ms a 700ms.
- Cierre con Escape y retorno de foco.
- Formularios con estados de loading y mensajes visibles.

## 9. Microinteracciones

Aplican a botones, links, iconos, navbar, buscador, carrito, filtros e imagenes:

- Feedback inmediato en click.
- Press scale pequeno.
- Hover de luz o borde, nunca glow exagerado.
- Duraciones cortas para feedback y mas lentas para reveals.
- Cleanup de listeners, intervals y observers.
