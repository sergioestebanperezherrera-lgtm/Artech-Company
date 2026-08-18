# UX_RULES - Artech

Reglas de comportamiento e interaccion del frontend. Para apariencia visual, ver `DESIGN_SYSTEM.md` y `UI_RULES.md`.

## 1. Estados Vacios y Carga

- Carrito vacio, catalogo sin resultados y pedidos sin historial deben mostrarse como estados vacios amigables, no como errores tecnicos.
- Las imagenes pueden mostrar skeleton o estado visual suave mientras cargan.
- Si una accion tarda, debe comunicar estado con mensajes breves y honestos.

## 2. Producto Sin Stock

- La `ProductCard` se muestra con menor disponibilidad visual.
- Se agrega `Badge` "Agotado".
- "Anadir al carrito" se deshabilita; no se oculta.

## 3. Buscador

- El buscador vive en navbar.
- Permite coincidencias parciales por nombre, marca y categoria.
- Enter navega a catalogo con query de busqueda.
- Escape cierra sugerencias o buscador cuando corresponde.
- Seleccionar una sugerencia navega al producto.

## 4. Filtros del Catalogo

- Soportan categoria, marca, precio y specs dinamicas.
- Desktop: sidebar.
- Mobile: panel/drawer usable a pantalla completa.
- Debe poder cerrarse con boton visible y Escape.

## 5. Navegacion de Catalogo

- Las categorias de navbar, mobile menu y footer navegan a `/catalogo?categoria=...`.
- Cambiar de una categoria a otra debe actualizar filtros y resultados.
- Se usa paginacion clasica, no scroll infinito.

## 6. Gate de Autenticacion

- El usuario puede revisar carrito sin iniciar sesion.
- Al intentar comprar sin sesion mock, se abre `AuthPanel`.
- El fondo se oscurece/desenfoca y la card mantiene foco visual.
- No existe checkout real todavia.

## 7. Login / Registro

- Inputs vacios por defecto.
- Usar placeholders y `autocomplete` correcto.
- Si se documenta una cuenta demo, debe mostrarse como ayuda visible, no como valor precargado.
- Validaciones visibles y mensajes no tecnicos.
- Boton mostrar/ocultar contrasena con `aria-label`.
- Cierre con Escape y boton visible.
- Los accesos sociales son pendientes de backend/OAuth.

## 8. Carrito

- Permite agregar, actualizar cantidad y eliminar productos.
- Debe persistir localmente.
- El boton de carrito desde cualquier pagina abre el drawer global.
- La pagina `/carrito` ofrece una vista dedicada del mismo contenido.

## 9. Moneda

- El usuario puede alternar entre GTQ y USD.
- La seleccion persiste localmente.
- Todo componente con precio debe usar el store global.

## 10. Errores

Los mensajes visibles para usuario deben ser claros:

- "No pudimos completar la accion. Intenta nuevamente."
- "Hubo un problema al cargar esta seccion."
- "Tu conexion parece inestable. Revisa internet e intenta otra vez."

No mostrar stack traces ni mensajes como "Unexpected error" en UI.

## 11. Accesibilidad

- Foco visible en elementos interactivos.
- Navegacion por teclado conservada.
- Modales con focus trap cuando esten abiertos.
- Estados de carga comunicados con `aria-live` cuando aplica.
- `prefers-reduced-motion` respetado.

## 12. Rutas de Producto

Usar `/producto/[slug]` con slug legible, nunca ID numerico visible en la URL.
