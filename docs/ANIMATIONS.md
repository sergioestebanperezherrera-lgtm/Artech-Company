# ANIMATIONS — Artech

Especificación exacta de cada animación del sitio. Regla general: el sitio anima **solo donde aporta valor** — si una sección no necesita movimiento, permanece completamente estática. Toda animación debe respetar `prefers-reduced-motion` (ver sección 7).

## 1. Fondo de partículas (global)

- **Dónde:** presente en **todas las páginas** del sitio, de fondo, detrás de todo el contenido.
- **Implementación recomendada:** Canvas API nativo (vanilla JS/TS), sin librería externa — decisión de arquitectura para mantener el sitio ligero (ver `ARCHITECTURE.md`).
- **Comportamiento:** puntos pequeños (radio ~0.5–1.5px), color `particle-color` (ver `DESIGN_SYSTEM.md`), cantidad aproximada: 40–50 partículas en pantallas desktop (ajustar proporcionalmente en mobile por rendimiento).
- **Movimiento:** desplazamiento lento y continuo en direcciones aleatorias, rebotando suavemente en los bordes del contenedor. Sin pausas, sin interacción del usuario requerida — es un efecto ambiental constante.
- **Rendimiento:** en dispositivos móviles de gama baja, reducir la cantidad de partículas o la velocidad si se detecta impacto en el rendimiento.

## 2. Aparición de secciones al hacer scroll

- **Trigger:** cuando la sección entra en el viewport.
- **Efecto:** fade-in + desplazamiento vertical leve (8–16px hacia arriba, terminando en su posición final).
- **Duración:** 400–600ms.
- **Easing:** ease-out.
- **Regla:** solo se aplica a secciones donde el movimiento ayuda a la lectura/jerarquía (ej. entrada del Home). Elementos que no lo necesitan permanecen estáticos.

## 3. Hover en tarjeta de producto

- **Trigger:** cursor sobre una `ProductCard`.
- **Efecto combinado:**
  - Elevación: `translateY(-4px)` aproximadamente.
  - Sombra: transición de `shadow-card` a `shadow-card-elevated` (ver `DESIGN_SYSTEM.md`).
  - Rotación 3D sutil: 2°–4°, dando sensación de volumen (no es un giro completo, es una inclinación leve que sigue la posición del cursor si es viable, o un valor fijo si se simplifica).
- **Duración:** ~300ms, ease.

## 4. Carrusel con auto-scroll (Ofertas, Novedades destacadas, "También te puede interesar", secciones de marca/categoría en Catálogo)

Todos los carruseles del sitio comparten el mismo comportamiento — consistencia total:

- **Avance automático:** cada **3.5 segundos**, avanza una tarjeta a la vez (no es un scroll continuo tipo cinta, son pasos discretos con transición suave entre cada uno).
- **Transición entre tarjetas:** deslizamiento suave, nunca corte abrupto.
- **Loop:** infinito — al llegar a la última tarjeta, vuelve a la primera sin salto brusco.
- **Pausa manual:** el usuario puede mantener presionado (mouse down / touch start) sobre el carrusel para pausar el auto-avance; al soltar (mouse up / touch end), el auto-avance se reanuda.
- **Control manual:** flechas prev/next siempre visibles, permiten navegar sin esperar al auto-avance.
- **Indicador visual:** la tarjeta actualmente "activa" se muestra a opacidad completa; las siguientes en la fila se muestran con opacidad reducida progresiva, insinuando el movimiento.

## 5. Borde RGB animado (exclusivo tarjetas GPU)

- **Dónde:** únicamente en `ProductCard` de tarjetas gráficas / productos con iluminación RGB (ver regla de uso en `UI_RULES.md`).
- **Efecto:** borde de la tarjeta con un degradado cónico (`conic-gradient`) que recorre los colores de `accent-rgb` (ver `DESIGN_SYSTEM.md`) en un giro completo de 360°.
- **Duración del ciclo:** ~4 segundos, loop infinito, velocidad constante (no ease, movimiento lineal).
- **Es la única animación continua e ininterrumpida del sitio** — todas las demás son disparadas por eventos (scroll, hover, click).

## 6. Login — animación de panel deslizante

- **Mecanismo:** ambos formularios (Iniciar sesión, Crear cuenta) existen simultáneamente en el DOM, uno al lado del otro. Un panel oscuro (`surface-panel-dark`) se desliza por encima cubriendo uno de los dos lados.
- **Propiedad animada:** `transform: translateX()`.
- **Duración:** 0.6 segundos.
- **Easing:** `cubic-bezier(0.65, 0, 0.35, 1)`.
- **Estados:**
  - Estado "Iniciar sesión" activo: panel oscuro en `translateX(0%)` (posición izquierda), formulario de "Crear cuenta" visible a la derecha.
  - Estado "Crear cuenta" activo: panel oscuro en `translateX(100%)` (posición derecha), formulario de "Iniciar sesión" visible a la izquierda.
- **Botón dentro del panel oscuro:** al presionarlo (estado `:active`), invierte momentáneamente sus colores (de blanco-sobre-negro a negro-sobre-blanco) como feedback táctil, luego dispara el cambio de estado descrito arriba.

## 7. Accesibilidad del movimiento

Toda animación de esta especificación debe respetar la media query `prefers-reduced-motion: reduce`: en ese caso, se deben eliminar o reducir a un mínimo imperceptible las animaciones de partículas, hover 3D, y transiciones de scroll — sin eliminar funcionalidad, solo el movimiento decorativo.
