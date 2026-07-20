# Registro de decisiones

Este archivo combina decisiones vigentes y propuestas pendientes. Una propuesta no se considera autorizada hasta cambiar su estado a **Aceptada**, con fecha y responsable.

## D-001 — Documentar antes de reorganizar

- Estado: Aceptada
- Fecha: 2026-07-19
- Contexto: existen duplicados y áreas de alto acoplamiento; una reorganización inmediata podría alterar comportamiento o perder código útil.
- Decisión: iniciar únicamente una fase documental con PRD, roadmap, decisiones y auditoría.
- Consecuencia: no se modifica código funcional, Supabase ni datos durante esta fase.

## D-002 — Proteger duplicados hasta aprobación

- Estado: Aceptada
- Fecha: 2026-07-19
- Contexto: hay pares de archivos en raíz y `src/` con contenidos distintos.
- Decisión: no borrar ni mover estos archivos hasta presentar un plan, verificar la fuente canónica y recibir aprobación explícita.
- Consecuencia: la ambigüedad permanece temporalmente, pero se evita una pérdida prematura.

## D-003 — Usar `main` actualizada como baseline documental

- Estado: Aceptada
- Fecha: 2026-07-19
- Contexto: el trabajo comenzó en `feature/crm-ui-v1`, con árbol limpio.
- Decisión: cambiar a `main`, actualizar por fast-forward desde GitHub y documentar sobre el commit `ecc2704c7c0a9e2da3f7f6c1d546b72bb0d644f3`.
- Consecuencia: los hallazgos de auditoría son trazables a ese commit.

## D-004 — Considerar `src/` como fuente canónica

- Estado: Aceptada
- Fecha: 2026-07-19
- Responsable: Pedro
- Contexto: `tsconfig.json` mapea `@/*` a `./src/*`; las rutas activas están en `src/app` y las importaciones observadas usan `@/lib`.
- Propuesta: adoptar `src/app`, `src/components` y `src/lib` como estructura canónica.
- Evidencia completada: typecheck, build local, manifest de rutas, source maps y smoke HTTP local usan `src/` y no los duplicados raíz.
- Evidencia remota completada: Vercel detecta el proyecto como Next.js desde la raíz del repositorio; la producción `READY` en `ecc2704` entrega la variante de `src/`, y los source maps locales del mismo baseline excluyen las copias raíz.
- Consecuencia si se acepta: los archivos raíz duplicados podrán evaluarse para retiro en un cambio separado y reversible.

## D-005 — Separar UI, dominio y acceso a datos

- Estado: Aceptada e implementada en su primer corte
- Fecha: 2026-07-19
- Contexto: varias páginas cliente combinan autenticación, consultas, mutaciones, estado, reglas y presentación; `src/app/page.tsx` supera las dos mil líneas.
- Decisión: modularizar por dominio y responsabilidad, conservando rutas y comportamiento.
- Consecuencia si se acepta: más archivos y límites explícitos, a cambio de menor acoplamiento y mejor capacidad de prueba.
- Implementación: modelo puro en `src/features/crm`, carga/revisión en `useCrmDashboardData` y una vista exportada por archivo bajo `src/components/crm`.
- Evidencia: `src/app/page.tsx` pasó de 2.375 a 1.498 líneas; typecheck aprobado y pruebas puras ampliadas de 6 a 11.

## D-006 — Mantener cambios de backend fuera de la reorganización

- Estado: Aceptada
- Fecha: 2026-07-19
- Contexto: el cliente depende de múltiples tablas, RPC y una Edge Function, pero el backend no fue auditado en esta fase.
- Propuesta: no mezclar reorganización de frontend con migraciones, políticas RLS, Auth, funciones o cambios de datos.
- Consecuencia si se acepta: cualquier ajuste de backend tendrá documento, autorización y verificación independientes.

## D-007 — Definir gestor de paquetes y lockfile

- Estado: Aceptada e implementada
- Fecha: 2026-07-19
- Contexto: `package.json` define scripts y dependencias, pero no se observó un lockfile rastreado en el inventario actual.
- Decisión: usar `pnpm@11.7.0`, Node `24.14.0` como runtime local recomendado y rastrear `pnpm-lock.yaml`.
- Evidencia: la instalación existente fue creada por pnpm 11.7.0; el lock promovido coincide exactamente con el lock del virtual store utilizado por el baseline.

## D-008 — Estrategia de pruebas

- Estado: Aceptada e implementada en su primer corte
- Fecha: 2026-07-19
- Responsable: Pedro
- Contexto: la Fase 2 creó una base de pruebas puras, pero faltaban CI, contratos, smoke reproducible, navegador y un procedimiento de release.
- Decisión: usar el runner nativo de Node para reglas/contratos, ejecutar typecheck, pruebas, build y smoke HTTP en GitHub Actions, y reservar las pruebas autenticadas o mutantes para un entorno Supabase controlado.
- Restricción: no usar producción para preparar fixtures, probar RPC mutantes ni automatizar login. No se añade un framework E2E hasta aprobar la dependencia y disponer del entorno aislado.
- Evidencia: 15/15 pruebas, build de 10 rutas, smoke 9/9 y revisión en navegador de login y formulario público en 1280×720 y 390×844.

## D-009 — Unificar el estado y contrato de prospectos

- Estado: Aceptada; estabilización frontend implementada
- Fecha: 2026-07-19
- Contexto: la vista heredada y el módulo nuevo usan campos y estados incompatibles (`name`/`company_name`, `convertido`/`convertido_cliente` y dos vocabularios de workflow).
- Propuesta: acordar una única máquina de estados y un contrato canónico antes de modificar conversión, filtros o métricas.
- Consecuencia si se acepta: se necesitará una estrategia de compatibilidad para datos existentes y pruebas de normalización.
- Implementación: estados canónicos centralizados, normalización de valores heredados, `company_name` como campo principal y protección por `converted_company_id`.
- Restricción pendiente: no migrar datos ni esquema sin autorización explícita.

## D-010 — Hacer atómicas las operaciones de integridad

- Estado: Aceptada e implementada para conversión y eliminación de prospectos
- Fecha: 2026-07-19
- Responsable: Pedro
- Contexto: conversión y eliminación ejecutan varias mutaciones independientes y pueden dejar estados parciales.
- Decisión: implementar RPC `SECURITY INVOKER`, autenticadas, transaccionales e idempotentes para convertir y eliminar prospectos.
- Consecuencia: el cliente deja de ejecutar pasos parciales; las altas conjuntas de empresa/contacto permanecen pendientes de un diseño separado.
- Evidencia: migración `20260720001733_phase_2_stabilization.sql`, permisos remotos comprobados y build aprobado. No se ejecutaron mutaciones de prueba contra datos productivos.

## D-011 — Separar superficies públicas e internas

- Estado: Aceptada; aislamiento frontend implementado
- Fecha: 2026-07-19
- Contexto: el layout raíz monta bridges CRM en todas las rutas; uno consulta `companies` inmediatamente incluso en la ruta pública.
- Propuesta: usar límites de layout/ruta que impidan cargar bridges y consultas internas en superficies públicas.
- Implementación: los bridges se cargan dinámicamente solo en las rutas que los utilizan. La ruta pública no descarga sus módulos en el smoke de producción.
- Pendiente: validar RLS como defensa obligatoria del backend.

## D-013 — Centralizar sesión CRM

- Estado: Aceptada e implementada
- Fecha: 2026-07-19
- Contexto: siete rutas repetían suscripción, login y logout, y algunas disparaban dos cargas al iniciar sesión.
- Decisión: centralizar el ciclo de sesión en `useCrmSession`, dejando las consultas de cada dominio en su ruta.
- Consecuencia: un solo lifecycle de Auth por página y carga de datos gobernada por el cambio de estado autenticado.

## D-012 — Baseline técnico local

- Estado: Aceptada como evidencia, no como validación funcional completa
- Fecha: 2026-07-19
- Decisión: registrar typecheck, build, manifests y smoke HTTP como baseline local del commit `ecc2704`.
- Limitación: no hubo hidratación con variables reales, login, acceso a datos ni validación del backend remoto.

## D-014 — Aplicar mínimo de privilegio a las RPC

- Estado: Aceptada e implementada
- Fecha: 2026-07-19
- Responsable: Pedro
- Contexto: todas las funciones heredaban ejecución desde `PUBLIC`; cualquier sesión anónima podía listar, aprobar o rechazar respuestas internas con privilegios del propietario.
- Decisión: reservar `get_cu_form` y `submit_cu_form` para `anon`/`authenticated`; retirar `PUBLIC`; convertir las RPC internas a `SECURITY INVOKER` y concederlas solo a `authenticated`.
- Consecuencia: las operaciones internas respetan RLS y ya no son invocables sin sesión. Las dos RPC públicas conservan `SECURITY DEFINER` por el flujo basado en token.

## D-015 — Posponer el endurecimiento de RLS hasta definir autorización

- Estado: Sustituida por D-016
- Fecha: 2026-07-19
- Contexto: las nueve tablas expuestas tienen políticas `ALL` con `USING (true)` y `WITH CHECK (true)` para cualquier usuario autenticado, pero el esquema no contiene propietario ni rol de negocio.
- Decisión: no inventar ownership ni hardcodear una identidad durante la estabilización. Mantener RLS habilitado, documentar el riesgo y exigir una decisión de producto antes de sustituir las políticas.
- Consecuencia: el CRM sigue siendo apropiado solo para un conjunto estrictamente controlado de usuarios internos; no se deben habilitar registros públicos ni invitar usuarios adicionales todavía.

## D-016 — Autorizar mediante allowlist privada

- Estado: Aceptada e implementada
- Fecha: 2026-07-19
- Responsable: Pedro
- Contexto: existen dos cuentas Auth internas y ninguna columna de ownership en las tablas de negocio. Un modelo por fila ampliaría el alcance sin una necesidad de producto confirmada.
- Decisión: registrar membresía en `private.crm_authorized_users`, comprobarla mediante una función privada y exigirla en las nueve políticas RLS. Pedro queda como `admin` y Ventas como `member`; ambos roles conservan por ahora el mismo CRUD.
- Seguridad: `anon` no conserva privilegios directos sobre tablas; la tabla de membresía no está expuesta; las cuentas Auth anónimas se rechazan; el frontend valida la autorización y cierra sesiones no incluidas.
- Operación: altas, bajas y cambios de rol deben realizarse con migraciones revisadas según `docs/AUTHORIZATION.md`. Crear una cuenta Auth por sí sola no concede acceso.
- Evidencia: ambos miembros ven 83 empresas, 220 prospectos y 8 respuestas en pruebas RLS; una identidad externa ve cero filas; una consulta `anon` directa recibe `42501 permission denied`.

## D-017 — Retirar los cinco duplicados raíz como una unidad

- Estado: Aceptada y ejecutada
- Fecha: 2026-07-19
- Contexto: `page.tsx`, `layout.tsx`, `globals.css`, `supabase.ts` y `types.ts` en la raíz son versiones heredadas; Next solo enruta `src/app`, los aliases resuelven a `src/lib` y el bundle no contiene las copias.
- Decisión: eliminarlos juntos en un commit estructural independiente, sin trasladar contenido ni cambiar configuración.
- Justificación: las 14 funciones del `page.tsx` raíz tienen equivalente nominal en la página canónica; `.card` es el único selector exclusivo de la hoja raíz y solo lo usa esa página; las copias de tipos y Supabase no tienen consumidores.
- Verificación: TypeScript dejó de enumerar las copias raíz; pasaron typecheck, 6/6 pruebas, build de 10 rutas, manifest y source maps.
- Reversión: revertir exclusivamente el commit de limpieza o recuperar los cinco archivos desde `957ba5e`.
- Gate: cerrado tras el checkpoint `f7dff54` en `READY` y la autorización explícita de Pedro para eliminar los cinco archivos.

## D-018 — Reemplazar bridges DOM solo cuando exista composición equivalente

- Estado: Aceptada e implementada parcialmente
- Fecha: 2026-07-19
- Contexto: ocho bridges montaban observers, listeners o portales para extender vistas existentes.
- Decisión: sustituir primero los bridges cuya intención puede expresarse con navegación o JSX directo, sin alterar flujos.
- Implementación: se retiraron `GlobalTopbarAddAction`, `AddContactFromDetail` y `ProspectingRouteBridge`; sus acciones ahora se renderizan directamente en las rutas propietarias.
- Límite: `HomeCommercialWorkbench`, `ActivitiesOperationalWorkbench`, `ContactCompletionBridge`, `AddActivityEntryBridge` y `LegacyViewLayoutPolish` permanecen hasta contar con equivalencia funcional y visual autenticada.

## D-019 — Derivar contratos del esquema remoto y limitar transiciones de revisión

- Estado: Aceptada e implementada
- Fecha: 2026-07-19
- Responsable: Pedro
- Contexto: los tipos manuales no comprobaban nombres de argumentos RPC ni protegían al frontend frente a columnas nuevas; la RPC de rechazo podía cambiar una respuesta después de aprobada.
- Decisión: generar `Database` desde el proyecto remoto, tipar el cliente Supabase, declarar columnas explícitas y hacer terminales las decisiones de revisión.
- Implementación: `database.types.ts`, contratos bajo `src/lib/data/`, corrección a `p_response_id` y migración `20260720031715_guard_customer_response_transitions.sql`.
- Límite: no imponer unicidad de respuesta por enlace ni limpiar las ocho respuestas de prueba sin una decisión de producto y autorización de datos separada.
- Evidencia: typecheck detecta el contrato RPC; verificación remota confirma `anon = false`, `authenticated = true` y conteos invariantes de 8 respuestas/8 pendientes.

## Plantilla para nuevas decisiones

### D-XXX — Título

- Estado: Propuesta | Aceptada | Rechazada | Sustituida
- Fecha:
- Responsable:
- Contexto:
- Decisión:
- Alternativas:
- Consecuencias:
- Evidencia/verificación:
