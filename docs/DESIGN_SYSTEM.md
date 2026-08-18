# DESIGN_SYSTEM - Artech

Este documento define los tokens y criterios visuales base del frontend. Las reglas de composicion viven en `UI_RULES.md` y las de movimiento en `ANIMATIONS.md`.

## 1. Direccion Visual

ARTECH usa una identidad monocromatica: negro profundo, grafito, grises, plata y blanco. El negro es el fondo principal de toda la aplicacion; los grises y blancos se usan para jerarquia, bordes, luz, texto, profundidad y materiales.

El sitio evita fondos blancos o bloques grises grandes. Las superficies elevadas se construyen con Liquid Glass oscuro, bordes finos, highlights sutiles y contraste controlado.

## 2. Paleta

| Token | Hex / valor base | Uso |
|---|---|---|
| `bg-base` | `#0A0A0A` | Fondo global de la aplicacion |
| `surface-card` | `#FFFFFF` | Superficie clara disponible para casos puntuales heredados |
| `surface-card-inset` | `#0A0A0A` | Contenedores internos oscuros y fondos de imagen |
| `surface-panel-dark` | `#111111` | Paneles oscuros y superficies elevadas |
| `text-primary-on-light` | `#111111` | Texto principal sobre superficies claras |
| `text-secondary-on-light` | `#6E6E73` | Texto secundario sobre superficies claras |
| `text-primary-on-dark` | `#FFFFFF` | Texto principal sobre superficies oscuras |
| `text-secondary-on-dark` | `#A0A0A0` | Texto secundario sobre superficies oscuras |
| `border-on-light` | `#D2D2D7` | Bordes sobre superficies claras |
| `border-on-dark` | `#2A2A2A` a `#3A3A3A` | Bordes sobre superficies oscuras |
| `accent-rgb` | `#FF3B3B -> #3B82F6 -> #A855F7 -> #22D3EE` | Borde animado exclusivo de GPUs con RGB |

## 3. Liquid Glass

Liquid Glass es el material principal de navbar, paneles y varias cards. Debe sentirse como cristal oscuro, no como un rectangulo negro opaco.

Componentes del material:

- Transparencia oscura controlada.
- `backdrop-filter` moderado, evitando aplicarlo a areas enormes si afecta rendimiento.
- Borde parcialmente iluminado.
- Highlights blancos/grises muy sutiles.
- Sombra minima para separacion.
- Variacion interna de luminosidad, nunca gris uniforme.

Los tokens CSS relacionados deben mantenerse centralizados en `globals.css`, por ejemplo variables `--glass-*`, `--motion-*` y easings compartidos.

## 4. Tipografia

- Familia principal: Inter.
- Titulos grandes: peso 500.
- Cuerpo: peso 400.
- Texto secundario: peso 400 con color secundario segun fondo.
- Precios y CTAs: peso 500.
- Texto visible para usuario: espanol.
- Nombres de archivos, variables y funciones en codigo: ingles.

En mobile, inputs y textareas deben tener `font-size >= 16px` para evitar zoom automatico en iOS sin deshabilitar el zoom de accesibilidad.

## 5. Iconografia

- Iconos de linea fina, preferentemente Lucide.
- Grosor visual aproximado: 1.5px.
- Heredan color del contexto.
- Los botones circulares de icono usan el mismo lenguaje Liquid Glass cuando viven en navbar o superficies oscuras.

## 6. Radios

| Token | Valor | Uso |
|---|---|---|
| `radius-card` | `12px` a `14px` | Cards y contenedores |
| `radius-card-large` | `16px` a `18px` | Modales, carrusel y paneles grandes |
| `radius-pill` | `20px` a `24px` | Botones tipo capsula |
| `radius-input` | `8px` | Inputs |
| `radius-image-inset` | `8px` a `10px` | Contenedores internos de imagen |

## 7. Sombras y Luz

Las sombras deben reforzar profundidad sin crear una estetica pesada. Los halos blancos/grises se usan de forma localizada, especialmente en hero, ofertas y productos destacados.

La luz del fondo nunca debe competir con texto, botones o productos.

## 8. Espaciado

Usar la escala estandar de Tailwind CSS como base. Cualquier espaciado nuevo debe alinearse con esa escala salvo que exista una razon clara de composicion.
