# Checklist de release y rollback

## Alcance

Este procedimiento cubre cambios del CRM en `main`. No autoriza migraciones, mutaciones de prueba ni limpieza de datos. Los cambios de Supabase requieren su propio plan, revisión y autorización.

## 1. Preparación

- [ ] Confirmar rama `main`, árbol limpio y commit base con `git status --short --branch` y `git log -1 --oneline`.
- [ ] Revisar el alcance y los documentos aplicables en `docs/`.
- [ ] Confirmar que no se incluyeron `.env.local`, secretos, payloads, exports o artefactos generados.
- [ ] Instalar con Node `24.14.0`, pnpm `11.7.0` y `pnpm install --frozen-lockfile`.
- [ ] Comprobar que las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` existen antes del build.
- [ ] Si cambia la capa de datos, regenerar `src/lib/database.types.ts`, contrastar migraciones remotas/locales y actualizar `docs/DATA-CONTRACTS.md`.
- [ ] Antes de cualquier nueva migración productiva, comprobar el historial remoto. Si la baseline sigue ausente, aprobar y ejecutar una sola vez `supabase migration repair --linked --status applied 20260720000000`; no ejecutar su SQL sobre producción.

## 2. Gates locales obligatorios

- [ ] Ejecutar `pnpm typecheck`.
- [ ] Ejecutar `pnpm test`.
- [ ] Ejecutar `pnpm build`.
- [ ] Iniciar el artefacto con `pnpm start`.
- [ ] Ejecutar `pnpm test:smoke`; las diez rutas deben responder `200` y la inexistente `404`.
- [ ] Abrir una pestaña nueva y comprobar que el login hidrata sin error overlay ni errores de consola.
- [ ] Revisar al menos un viewport de escritorio y uno móvil; comprobar overflow y nombres/etiquetas de controles.
- [ ] Si el cambio afecta una superficie autenticada, validarla contra un entorno de datos controlado antes de aprobar el release.
- [ ] Ejecutar `pnpm test:integration` sólo con variables `QE_TEST_*` de un proyecto desechable; repetir el `project_ref` en `QE_TEST_SUPABASE_PROJECT_REF` y `QE_TEST_CONFIRM_DISPOSABLE_PROJECT` antes de iniciar.
- [ ] Para cambios de campaña, ejecutar `pnpm test:campaign:smoke` sin autenticación y `pnpm test:campaign:e2e` únicamente en el proyecto desechable confirmado.
- [ ] Confirmar que las pruebas de campaña usan direcciones `.invalid` para fixtures y que ningún paso automatizado invoca un envío a clientes.
- [ ] Para el piloto real, verificar en modo preview que existan exactamente cinco filas `approved`, con correos únicos, enlaces activos y cero respuestas previas; no usar el send durante pruebas.

Un HTTP `200` no sustituye la verificación de hidratación. Las variables `NEXT_PUBLIC_` quedan embebidas durante el build.

## 3. Supabase y datos

- [ ] No ejecutar RPC mutantes, inserts, updates o deletes contra producción como prueba.
- [ ] Aplicar migraciones sólo con autorización y en orden trazable.
- [ ] Verificar RLS, grants y advisors después de cualquier cambio de backend.
- [ ] Comparar conteos antes/después cuando la migración declara que no modifica filas.
- [ ] Preparar SQL de reversión cuando sea seguro; una reversión destructiva de datos requiere aprobación separada.
- [ ] Provisionar los cinco destinatarios aprobados fuera de Git y comprobar que `campaign_pilot_recipients` no concede acceso a `anon` ni `authenticated`.
- [ ] Desplegar `send-approved-campaign-pilot` con `verify_jwt = true` y comprobar que una invocación sin JWT se rechaza antes de habilitar la interfaz.
- [ ] No restablecer filas `sending`, `sent` o `failed` a `approved` sin revisar primero el resultado de ZeptoMail y obtener una autorización independiente.

## 4. Publicación y observación

- [ ] Revisar el diff final y crear un commit de alcance único.
- [ ] Publicar `main` y esperar CI verde.
- [ ] Confirmar que el deployment de Vercel asociado al commit llega a `READY`.
- [ ] Ejecutar smoke sobre la URL pública sin iniciar sesión ni mutar datos.
- [ ] Abrir el login público en una pestaña limpia y revisar consola/hidratación.
- [ ] Revisar errores de build y runtime posteriores al deployment.
- [ ] No registrar emails, UUID, tokens, payloads de formularios ni claves en logs o tickets.

## 5. Criterios de rollback

Revertir cuando el deployment no llega a `READY`, falla una ruta crítica, la UI no hidrata, aparecen errores sostenidos de runtime o un contrato de datos deja de coincidir con el backend.

Procedimiento:

1. detener nuevas publicaciones;
2. conservar evidencia mínima sin datos sensibles: commit, deployment, ruta, hora y mensaje de error saneado;
3. promover el deployment estable anterior en Vercel si el impacto es inmediato;
4. crear un `git revert` del commit causante y publicarlo como cambio trazable; no usar `git reset --hard` sobre historia compartida;
5. para una migración, ejecutar únicamente el rollback previamente revisado si no destruye datos; de lo contrario, aislar el sistema y solicitar autorización;
6. repetir typecheck, pruebas, build, smoke y revisión de hidratación;
7. registrar causa y decisión en `docs/AUDIT.md` o `docs/DECISIONS.md`.

## 6. Deuda que bloquea el E2E completo

- rama o proyecto Supabase aislado;
- fixtures sintéticos y reiniciables;
- cuentas `admin`, `member` y no autorizada exclusivas de prueba;
- aprobación de una dependencia de automatización de navegador;
- política de retención y alertas para telemetría sin datos sensibles.

Hasta cerrar esos puntos, el gate automatizado cubre reglas, contratos, build y entrega HTTP; el gate visual cubre superficies públicas y de acceso sin autenticar.
