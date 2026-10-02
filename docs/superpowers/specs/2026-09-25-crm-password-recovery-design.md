# Recuperación de contraseña del CRM — diseño

Fecha: 2026-09-25. Estado: diseño aprobado para revisión escrita. Rama: `codex/crm-password-recovery`.

## Objetivo y alcance

Permitir que cualquiera de los usuarios autorizados del CRM recupere su acceso sin revelar su contraseña a un operador. El flujo usa Supabase Auth ya integrado. No añade proveedores, variables de entorno, permisos CRM, tablas ni migraciones. No cambia una cuenta, envía correos reales ni modifica la configuración remota durante la preparación en esta rama.

## Decisión de diseño

Se eligió un flujo de autoservicio frente a un restablecimiento manual por administrador: reduce la dependencia operativa y mantiene la nueva contraseña exclusivamente entre el usuario y Supabase. La recuperación seguirá siendo independiente de la autorización CRM: un enlace válido autentica la identidad, pero el acceso a datos continúa sujeto a la allowlist privada y RLS. La página de cambio verificará esa autorización antes de aceptar una contraseña nueva; una identidad no autorizada recibirá un mensaje genérico y cerrará la sesión de recuperación.

## Interfaz y recorrido

1. El acceso principal muestra «¿Olvidaste tu contraseña?» junto al formulario existente. El enlace abre una página pública para solicitar recuperación.
2. El usuario introduce su correo. El cliente llama `supabase.auth.resetPasswordForEmail(email, { redirectTo })`, con `redirectTo` construido desde el origen actual más la ruta fija `/restablecer-clave`.
3. Si Supabase acepta la solicitud, la interfaz muestra la misma confirmación para correos existentes e inexistentes. En caso de fallo de red o límite de envío, muestra un error operativo sin indicar si la cuenta existe. No conserva ni registra el correo en logs.
4. El enlace del correo lleva a `/restablecer-clave`. La página espera a que Supabase procese el enlace y comprueba que hay una sesión válida. También comprueba `get_crm_session_context`; sólo una identidad autorizada puede continuar. Si el enlace expiró o es inválido, ofrece volver a solicitar otro.
5. El usuario elige y confirma una contraseña nueva. El cliente valida que ambos campos coincidan y deja a Supabase aplicar la política de longitud y seguridad configurada en Auth; luego llama `supabase.auth.updateUser({ password })`. Muestra éxito o un error seguro; limpia los campos después del envío. Al terminar, cierra sólo la sesión de este navegador y dirige al acceso para iniciar sesión con la nueva clave.

## Límites de seguridad y operación

- No se crea una ruta de servidor con clave `service_role` ni un mecanismo alternativo de acceso.
- Solicitar recuperación no equivale a dar acceso CRM. La allowlist privada y RLS permanecen intactas.
- El enlace de recuperación se procesa en el navegador según el flujo de Supabase; la aplicación no imprime ni registra su token, URL completa, UUID o credenciales en la interfaz, pruebas, CI o logs.
- La URL de retorno debe estar autorizada en Supabase Auth. Para validar un preview, se autorizará su URL exacta mediante un gate posterior; no se abrirá un comodín amplio de previews. La configuración remota no forma parte de este cambio.
- El envío de correos reales y el cambio de contraseña de cualquier cuenta quedan para la validación interactiva del usuario después de publicar y configurar el entorno.
- La entrega en la rama no hará merge ni despliegue productivo por sí sola.

## Componentes previstos

- Enlace de recuperación en `src/app/page.tsx`.
- Página de solicitud en `src/app/recuperar-clave/page.tsx`.
- Página de cambio en `src/app/restablecer-clave/page.tsx`.
- Lógica compartida y comprobable para los estados de solicitud y cambio, sin duplicar el cliente de Supabase ni alterar `useCrmSession` salvo necesidad verificada.

## Verificación y aceptación

- Pruebas de contrato o unidad con cliente simulado: solicitud aceptada, fallo de red, respuesta indistinguible para correo inexistente, enlace inválido, ausencia de sesión, identidad no autorizada, contraseñas diferentes, actualización fallida y actualización exitosa.
- `pnpm typecheck`, `pnpm test`, `pnpm build` y smoke HTTP local sobre las rutas públicas, sin enviar correo real.
- Revisión de accesibilidad del formulario, estados de carga y navegación por teclado.
- Revisión final de `git diff` para excluir secretos, correo personal, tokens, datos y artefactos generados.
- Validación real diferida: aprobar URL exacta de retorno en Auth, publicar preview, solicitar un correo para una cuenta controlada, abrir enlace, cambiar clave y comprobar acceso CRM. Este último paso requiere autorización independiente.
