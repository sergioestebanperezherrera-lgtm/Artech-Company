# AI_GUIDELINES — Artech

Este documento aplica a cualquier IA (incluido Codex) que programe sobre este proyecto. Es un complemento a todos los demás documentos — no repite sus reglas, pero exige que se sigan.

## 1. Esta documentación es la fuente de verdad

- No inventes decisiones de diseño, arquitectura o negocio que no estén en `/docs`. Si una decisión no está cubierta, señala explícitamente la ambigüedad en el commit/PR o en un comentario, en vez de asumir silenciosamente.
- Si dos documentos parecieran contradecirse, repórtalo — no seas tú quien decide cuál prevalece.

## 2. Assets

- Nunca generes, descargues de internet, ni inventes imágenes, logos o íconos de marca reales. Sigue estrictamente la regla de placeholders de `PROJECT_SPEC.md`.
- Todo espacio para un asset del cliente debe quedar claramente marcado en el código (comentario o nombre de archivo esperado), nunca relleno con una imagen de stock o generada.

## 3. Orden de construcción

- Sigue el orden de `ROADMAP.md` estrictamente. No construyas una página antes de que los componentes de los que depende (ver mapa de dependencias en `ARCHITECTURE.md`) estén listos.

## 4. Reutilización de componentes

- Antes de escribir una pieza de UI, revisa `COMPONENTS.md` — si ya existe un componente para ese propósito (especialmente `ProductCard` y `AutoScrollCarousel`), reutilízalo. Nunca dupliques su lógica dentro de una página.
- Respeta la separación página/componente de `ARCHITECTURE.md` sección 3.

## 5. Alcance — qué NO implementar todavía

Según `PROJECT_SPEC.md`, están fuera de alcance en esta etapa:
- Backend real, base de datos.
- Autenticación funcional (el login es visual + mock, ver `ARCHITECTURE.md` sección 5).
- Pasarela de pago real.
- Reseñas, favoritos/wishlist, multi-idioma.

No implementes estas funcionalidades "por adelantado" ni con soluciones improvisadas — usa los mocks y placeholders definidos en `API_CONTRACT.md`.

## 6. Capa de datos

- Los componentes nunca deben importar datos directamente de `lib/data/`. Siempre pasan por `lib/services/` (ver `ARCHITECTURE.md` sección 5), para que el día que exista backend real, el cambio sea aislado a esa capa.
- Sigue el modelo de datos exacto de `API_CONTRACT.md` al crear los mocks — no improvises campos ni nombres distintos.

## 7. Estilo de código

- No hardcodees valores de color, tipografía, radios o sombras directamente en componentes — usa los tokens definidos en `DESIGN_SYSTEM.md`, implementados como configuración de Tailwind o variables CSS.
- TypeScript estricto: define tipos explícitos para las props de cada componente, basados en `lib/types/`.
- Nombres de variables, funciones y archivos en inglés (convención de código); el texto visible para el usuario (copy de UI) en español, según `UX_RULES.md` sección 8.

## 8. Accesibilidad

- Todo elemento interactivo debe tener estado de foco visible.
- Respeta `prefers-reduced-motion` en toda animación (ver `ANIMATIONS.md` sección 7).
- Mantén el contraste de texto/fondo consistente con los tokens de `DESIGN_SYSTEM.md` (ya están calculados para buen contraste; no los sustituyas por valores similares "a ojo").

## 9. Cuando algo no está claro

Si al implementar una pantalla encuentras un caso no cubierto por la documentación (un estado de UI no descrito, una interacción ambigua), la acción correcta es:
1. Revisar si el patrón ya resuelto en otra parte del sitio aplica por analogía (ej. estados vacíos siguen siempre el mismo patrón, ver `UX_RULES.md` sección 1).
2. Si no hay patrón aplicable, dejar constancia explícita de la decisión tomada y por qué, en vez de decidir en silencio.
