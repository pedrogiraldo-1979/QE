# Autorización del CRM

## Modelo vigente

El acceso interno usa una allowlist almacenada en `private.crm_authorized_users`. Supabase Auth prueba la identidad; la allowlist decide si esa identidad puede usar el CRM. Crear una cuenta Auth no concede acceso automáticamente.

Miembros iniciales:

| Cuenta | Rol | Estado |
| --- | --- | --- |
| `pedro.giraldo@gmail.com` | `admin` | activo |
| `ventas@quindioexquisito.com` | `member` | activo |

Los roles quedan registrados para una futura separación de permisos. Actualmente `admin` y `member` tienen el mismo CRUD sobre el CRM.

## Flujo de autorización

1. Supabase Auth valida email y contraseña.
2. `public.is_crm_authorized()` consulta la función privada para la identidad actual.
3. El frontend rechaza y cierra sesiones no autorizadas.
4. Independientemente del frontend, RLS vuelve a comprobar la membresía en cada consulta o mutación.
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

Un cambio de rol no modifica capacidades hasta que existan políticas diferenciadas aprobadas.

## Recuperación administrativa

Si todos los administradores quedaran fuera, usar el SQL Editor de Supabase con una cuenta autorizada del proyecto para reactivar o insertar el UUID correcto. No crear RPC públicas para administrar la allowlist y nunca usar una clave `service_role` en el navegador.
