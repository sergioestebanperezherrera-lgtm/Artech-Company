# Bootstrap de SUPER_ADMIN en produccion

Este procedimiento asigna el primer rol `SUPER_ADMIN` a un usuario que ya existe en PostgreSQL. Es una operacion CLI dentro del servicio backend de Railway; no expone ningun endpoint HTTP y no crea usuarios.

## Protecciones

- `admin:grant` continua bloqueado cuando `NODE_ENV=production`.
- El bootstrap solo funciona dentro del servicio Railway cuyo entorno se llama `production`.
- Requiere una habilitacion efimera, `--confirm-production` y repetir el email.
- Solo consulta `id`, `email`, estado del usuario y estado opcional del empleado. Nunca consulta `passwordHash`.
- Usa una transaccion serializable.
- Si ya existe un `SUPER_ADMIN`, el mecanismo rechaza cualquier email distinto.
- Repetirlo para el mismo usuario es seguro y no duplica `UserRole`.

## Ejecucion en Railway

1. Confirma que el usuario ya se registro y que conoces exactamente su email.
2. Desde el dashboard de Railway, copia el comando SSH del servicio backend de produccion, o selecciona explicitamente servicio y entorno con Railway CLI.
3. Abre la sesion:

```bash
railway ssh --service <BACKEND_SERVICE> --environment production
```

4. Dentro del contenedor, sustituye ambos emails por el mismo usuario existente y ejecuta:

```bash
ARTECH_ALLOW_PRODUCTION_SUPER_ADMIN_BOOTSTRAP=ALLOW_FIRST_SUPER_ADMIN_ONCE npm run admin:bootstrap-super-admin -- --email "admin@example.com" --confirm-email "admin@example.com" --confirm-production
```

La variable se aplica solamente a ese proceso. No la agregues a las variables persistentes del servicio.

Resultado esperado la primera vez:

```text
SUPER_ADMIN granted to admin@example.com.
```

Una repeticion inmediata con el mismo usuario responde `already assigned` y no crea duplicados. Un email diferente sera rechazado una vez creado el primer `SUPER_ADMIN`.

## Verificacion

Con la sesion del usuario objetivo activa, recarga `/admin`. Tambien puedes inspeccionar la respuesta autenticada de `GET /api/admin/me`; debe responder `200`, incluir `SUPER_ADMIN` en `roles`, los permisos efectivos y `canAccessAdmin: true`.

No uses `/api/auth/me` ni datos del navegador como autoridad para conceder el rol. La asignacion se verifica contra PostgreSQL mediante la sesion HttpOnly y `/api/admin/me`.

## Cierre

Cuando la habilitacion se proporciona inline como se indica arriba, desaparece al finalizar el comando y no requiere limpieza adicional. El mecanismo tambien queda cerrado a otros usuarios desde la base porque ya existe un `SUPER_ADMIN`.

Si la variable se agrego por error a Railway como variable persistente, eliminala inmediatamente del servicio y despliega el cambio de variables:

```bash
railway variable delete ARTECH_ALLOW_PRODUCTION_SUPER_ADMIN_BOOTSTRAP --service <BACKEND_SERVICE> --environment production
```

No ejecutes este procedimiento desde CI, un endpoint, el frontend o una tarea automatica de deploy.
