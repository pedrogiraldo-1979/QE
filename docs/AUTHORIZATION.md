# Autorización del CRM

## Modelo vigente

El acceso interno usa una allowlist almacenada en `private.crm_authorized_users`. Supabase Auth prueba la identidad; la allowlist decide si esa identidad puede usar el CRM. Crear una cuenta Auth no concede acceso automáticamente.

Miembros iniciales:

| Cuenta | Rol | Estado |
| --- | --- | --- |
| `pedro.giraldo@gmail.com` | `admin` | activo |
| `ventas@quindioexquisito.com` | `member` | activo |

`member` puede leer, crear y actualizar las entidades comerciales (`companies`, `contacts`, actividades y prospección), además de convertir prospectos. `admin` conserva esas capacidades y administra enlaces de actualización, respuestas de clientes y conciliación de maestros. Ningún rol cliente puede borrar físicamente registros.

## Flujo de autorización

1. Supabase Auth valida email y contraseña.
2. `public.get_crm_session_context()` obtiene autorización y rol desde la allowlist privada para la identidad actual; `public.is_crm_authorized()` se conserva como comprobación booleana compatible.
3. El frontend rechaza y cierra sesiones no autorizadas.
4. Independientemente del frontend, RLS y los wrappers `admin_*` vuelven a comprobar la membresía y el rol en cada consulta o mutación sensible.
5. `anon` no tiene privilegios directos sobre las tablas CRM.

## Agregar un miembro

1. Crear primero la cuenta en Supabase Auth.
2. Obtener el UUID generado.
3. Crear una migración revisada con una inserción explícita:

```sql
insert into private.crm_authorized_users (user_id, role, active)
values ('UUID_GENERADO_POR_AUTH', 'member', true);
```

No usar emails como clave de autorización y no añadir permisos en `user_metadata`.

La baseline y las migraciones estructurales no siembran membresías. Los UUID pertenecen al entorno y deben añadirse únicamente después de crear las cuentas Auth correspondientes, mediante una migración operativa revisada para ese proyecto.

## Desactivar o reactivar

Preferir desactivar la membresía cuando se necesite conservar trazabilidad:

```sql
update private.crm_authorized_users
set active = false, updated_at = now()
where user_id = 'UUID_DEL_USUARIO';
```

Para reactivar, usar `active = true`. Después de retirar acceso, cerrar o revocar las sesiones activas del usuario desde Auth; eliminar una cuenta no invalida por sí solo todos los tokens ya emitidos de forma instantánea.

## Cambiar rol

```sql
update private.crm_authorized_users
set role = 'admin', updated_at = now()
where user_id = 'UUID_DEL_USUARIO';
```

El cambio afecta las nuevas solicitudes y sesiones que se revaliden. Para retirar acceso, revocar las sesiones activas en Auth además de desactivar la membresía.

## Recuperación administrativa

### Contraseña propia de un usuario existente

El acceso principal ofrece **¿Olvidaste tu contraseña?** hacia `/recuperar-clave`. La solicitud responde de forma genérica para no revelar si existe una cuenta. El enlace debe redirigir al origen autorizado y a `/restablecer-clave`; no crea cuentas ni cambia membresías.

La pantalla de cambio exige un enlace de recuperación, una identidad verificada con Supabase Auth y autorización CRM. La clave y su confirmación deben coincidir y tener al menos ocho caracteres. Después del éxito se solicita el cierre global de sesiones, con cierre local como alternativa. La nueva contraseña la introduce únicamente la titular; no se registra en logs ni documentación. Recargar la página después de consumir el enlace puede requerir solicitar uno nuevo.

Para producción debe autorizarse la URL exacta `https://qe-crm.vercel.app/restablecer-clave` en Supabase Auth. El servicio de correo incorporado puede rechazar destinatarios externos al equipo de Supabase; configurar SMTP propio requiere autorización y credenciales independientes.

### Recuperar autorización administrativa

Si todos los administradores quedaran fuera, usar el SQL Editor de Supabase con una cuenta autorizada del proyecto para reactivar o insertar el UUID correcto. No crear RPC públicas para administrar la allowlist y nunca usar una clave `service_role` en el navegador.

## Límites vigentes

- La visibilidad de la interfaz es sólo una ayuda: RLS y las RPC protegidas son la autoridad.
- `cu_links`, las respuestas de clientes y la cola de maestros son exclusivas de `admin`.
- Auditoría, eliminación lógica, restauración, administración autocontenida de membresías y el nuevo ciclo público de enlaces permanecen diferidos a planes independientes.
