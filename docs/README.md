# Artech — Documentación del proyecto

Esta carpeta es la **fuente de verdad** del proyecto Artech. Cualquier desarrollador o IA (incluido Codex) debe poder construir el frontend completo leyendo únicamente estos documentos, sin haber participado en ninguna conversación previa de diseño.

## Estado actual

- Diseño de producto y sistema de diseño: **cerrado**.
- Arquitectura técnica y roadmap: **definidos**.
- Código: **no iniciado**. Esta documentación es el punto de partida para la implementación.
- Backend: **no existe todavía**. El frontend se construye contra datos mock, preparado para conectarse a una API real más adelante (ver `API_CONTRACT.md`).

## Índice de documentos

| Documento | Contenido |
|---|---|
| [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) | Qué es Artech, a quién vende, alcance de esta etapa, reglas de negocio no negociables (moneda, idioma, assets) |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Tokens visuales: paleta de color, tipografía, iconografía, radios, sombras, espaciado |
| [`UI_RULES.md`](./UI_RULES.md) | Cómo se combinan los tokens del sistema de diseño: patrón de contraste en capas, jerarquía de botones, reglas de grid, composición del Home |
| [`ANIMATIONS.md`](./ANIMATIONS.md) | Especificación exacta de cada animación y microinteracción del sitio |
| [`RESPONSIVE.md`](./RESPONSIVE.md) | Breakpoints y comportamiento responsive de cada sección (mobile-first) |
| [`COMPONENTS.md`](./COMPONENTS.md) | Inventario de todos los componentes, su responsabilidad y dónde se usan |
| [`UX_RULES.md`](./UX_RULES.md) | Reglas de comportamiento e interacción: estados vacíos, sin stock, buscador, gate de autenticación, etc. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Stack tecnológico, estructura de carpetas, separación página/componente, capa de datos |
| [`API_CONTRACT.md`](./API_CONTRACT.md) | Forma de los datos y endpoints propuestos para cuando exista backend real |
| [`ROADMAP.md`](./ROADMAP.md) | Fases de implementación, en orden, del primer commit al frontend funcional |
| [`AI_GUIDELINES.md`](./AI_GUIDELINES.md) | Reglas específicas para cualquier IA que programe sobre este proyecto |

## Cómo leer esta documentación

1. Empieza por `PROJECT_SPEC.md` para entender qué se está construyendo.
2. Lee `DESIGN_SYSTEM.md`, `UI_RULES.md`, `ANIMATIONS.md` y `RESPONSIVE.md` para entender el lenguaje visual completo.
3. Lee `ARCHITECTURE.md` y `COMPONENTS.md` para entender cómo se organiza el código.
4. Lee `ROADMAP.md` antes de escribir la primera línea de código — define el orden obligatorio de construcción.
5. Consulta `UX_RULES.md` y `API_CONTRACT.md` según se necesiten durante el desarrollo de cada pantalla.
6. `AI_GUIDELINES.md` aplica en todo momento mientras se programa.

Cada documento tiene una única responsabilidad. Si necesitas un valor exacto (un color, un timing de animación, una regla de negocio), **siempre existe un solo lugar donde buscarlo** — evita copiar valores entre documentos; en su lugar, referencia el documento correspondiente.
