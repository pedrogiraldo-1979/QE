# Conciliación del historial de migraciones — plan de investigación y decisión

**Estado posterior (2026-09-28): estrategia B aceptada en D-030; preparación operativa abierta.** El PR #34 ya publicó y verificó una baseline estructural independiente en proyectos temporales vacíos; el PR #33 ya sincronizó los tipos de QE2026. Ninguno concilió las 29 versiones del historial productivo con los diez archivos históricos locales. Pedro aprobó conservar ambas historias intactas y reservar la baseline para proyectos vacíos. Esa decisión no autoriza `migration repair`, `db push` ni un cambio en QE2026.

> **Para agentes:** usar `executing-plans` para los pasos documentales. No delegar en subagentes salvo petición expresa de Pedro. Ninguna casilla de este plan autoriza ejecutar `migration repair`, `db push`, SQL remoto ni borrar archivos.

**Objetivo:** establecer una correspondencia auditable entre el historial de QE2026 y `supabase/migrations/`, y elegir una vía segura para futuros despliegues sin repetir SQL histórico ni alterar datos.

**Arquitectura:** primero inventariar versiones y contenido con acceso de solo lectura; después probar la reproducibilidad del esquema en un proyecto desechable; por último presentar alternativas de historia canónica y solicitar una decisión específica antes de tocar metadatos remotos o archivos SQL.

**Tecnología:** Supabase PostgreSQL, migraciones SQL versionadas, CLI oficial cuando esté disponible, pnpm para verificaciones del repositorio.

## Restricciones globales

- Producción: QE2026 (`izbfawwmbilmsrdjaanw`), sólo lectura durante este plan. Confirmar `project_ref` en cada sesión.
- No ejecutar `supabase db push`, `migration repair`, `db pull` con confirmación de historia, `apply_migration`, DDL ni DML en producción. Se permiten únicamente consultas `SELECT` de metadatos e historial para la matriz autorizada, sin devolver el SQL registrado ni filas comerciales. Según la [referencia de Supabase](https://supabase.com/docs/reference/cli/supabase-migration-repair), `repair --status applied` inserta registros y `--status reverted` los elimina del historial; ninguna operación equivale a aplicar o revertir el esquema.
- No borrar, mover, renombrar ni duplicar archivos históricos sin inventario, impacto, plan reversible y autorización explícita.
- No copiar miembros de Auth, UUID de usuarios, correos, tokens ni filas comerciales a proyectos temporales o Git.
- No instalar CLI, dependencias ni herramientas nuevas sin un gate separado. La CLI no estaba instalada durante el release RBAC; descubrir su versión y `--help` antes de usarla si se habilita.
- No tratar equivalencia de nombres o de SQL normalizado como prueba suficiente de equivalencia del esquema final.

## Evidencia de partida, 2026-09-25

El historial remoto enumera 29 versiones; el directorio local contiene diez archivos. La consulta fue de solo lectura. Clasificación inicial:

| Grupo | Local/remoto | Riesgo |
| --- | --- | --- |
| Cuatro versiones incrementales exactas | `20260720001733`, `20260720002112`, `20260720012701`, `20260720031715` | SQL normalizado previamente contrastado; revalidar antes de reparar. |
| Baseline `20260720000000` | Mismo número; remoto es marcador de esquema preexistente, local reconstruye estructura | No ejecutar el SQL local en producción. |
| Allowlist `20260720012043` | Mismo número; remoto sembró membresías, local retiró la siembra | No reproducir identidades ni reemplazar el archivo local por SQL productivo. |
| Tres pares de versión distinta | Piloto `20260721023246`/`20260721030022`; aprobación/maestros `20260721170728`/`20260721173624`; colegios `20260826000000`/`20260827015743` | SQL normalizado previamente idéntico; las versiones siguen desalineadas. |
| RBAC | Local `20260917000000`; remoto `20260925200537` | Una aplicación aprobada del mismo archivo quedó registrada con fecha distinta; conservar ambas evidencias. |
| Sólo remoto | 19 entradas: 13 fundacionales de julio y seis posteriores de formulario/campaña | No existen archivos locales de estas versiones; algunos cambios explican el diff de tipos actual. |

Las seis entradas remotas posteriores sin archivo local son `20260722031506`, `20260722034019`, `20260722034030`, `20260722034045`, `20260722142520` y `20260804203513`. Las 13 anteriores al 20 de julio abarcan `20260701140601`–`20260707013441` y fueron absorbidas estructuralmente por la baseline local, no por identidad de historia. `docs/DECISIONS.md` D-021 aún indica que la baseline no figura en producción; el historial remoto actual sí la contiene. La diferencia se registra en `docs/AUDIT.md`, sin reescribir la decisión histórica.

Revalidación de solo lectura posterior: los cuatro pares incrementales de misma versión, los tres pares de timestamps distintos y RBAC coinciden al normalizar comentarios y espacios. Dos pares coinciden como texto LF completo y siete de los ocho tras recortar únicamente espacios y saltos exteriores; el octavo (`20260720031715`) conserva un comentario local adicional. El SQL RBAC remoto coincide bajo ese recorte de extremos con el archivo local de SHA-256 `E3333A7D9C394A6ADABB3E41A4D51BE5791A0BAF920B0797A5B8DDD45135FE1E`. La baseline y la allowlist no son equivalentes; el contenido de la siembra de membresías no se publicó ni imprimió.

**Aclaración posterior (2026-09-28):** la nueva [matriz de huellas](../../MIGRATION-HISTORY-MATRIX.md) observa sólo dos coincidencias `MD5-LF` sin recortar los extremos. Al recortar únicamente espacios y saltos iniciales/finales, siete de los ocho pares sí coinciden exactamente; el octavo (`20260720031715`) mantiene el comentario local adicional. Así se reconcilia el conteo anterior. La identidad textual bajo ese criterio tampoco sustituye una revisión semántica ni autoriza ejecutar SQL.

Inventario inicial de las 19 entradas sólo remotas: las 13 primeras crean o ajustan enlaces/respuestas de clientes, prospección, políticas, grants y funciones; las seis posteriores ajustan precarga/revisión y lotes de campaña. Tres contienen un `UPDATE` de nivel superior sobre filas preexistentes: `20260707013441` normaliza campos de `contacts`, `20260722034019` rellena `campaign_pilot_recipients.batch_key` antes de hacerlo no nulo y `20260722142520` reconcilia `cu_responses.confirm_no_changes` con su payload. Otras funciones contienen DML en su cuerpo ejecutable al invocarlas; eso no equivale a DML de la migración. Ninguna de estas entradas debe repetirse en QE2026 para “igualar” el historial.

## Resultado del ensayo aislado aprobado

Pedro confirmó la organización «Quindi Exquisito», el costo indicado por Supabase ($0/mes) y un replay **sin datos reales**. El proyecto temporal `ludafyflotobvmowlmej` fue creado vacío y verificado dos veces contra el ref productivo distinto `izbfawwmbilmsrdjaanw`. Se ejecutaron ocho archivos completos, el prefijo DDL de la novena migración (columna e índice de campaña, sin los 31 contactos institucionales) y RBAC como décimo paso. El proyecto temporal tenía cero filas CRM, usuarios Auth y membresías antes y después. Las versiones del historial temporal fueron asignadas por el conector; no son las versiones de los archivos locales ni deben copiarse a producción.

| Superficie | QE2026 | Temporal | Resultado |
| --- | ---: | ---: | --- |
| Tablas `public`/`private` y RLS | 11 | 11 | Coinciden |
| Columnas | 140 | 139 | Falta `campaign_pilot_recipients.batch_key` |
| Constraints | 36 | 36 | Dos unicidades por lote sustituyen dos simples; secuencia 1–100 frente a 1–5 |
| Índices | 37 | 36 | Cambia el par de índices únicos de lote y falta `campaign_pilot_recipients_batch_status_idx` |
| Funciones | 22 | 21 | Falta `claim_campaign_batch`; otras cuatro definiciones comunes difieren más allá de comentarios/espacios |
| Políticas RLS | 25 | 25 | Coinciden exactamente |
| Grants de tabla | 95 | 95 | Coinciden exactamente |
| Grants de función | 66 | 63 | Coinciden los de funciones compartidas; faltan sólo las tres filas de roles de `claim_campaign_batch` |
| Tipos generados | 914 líneas | 882 líneas | El temporal coincide con el snapshot local anterior; no con producción |

Las cuatro funciones comunes cuyas definiciones siguen distintas tras normalizar comentarios y espacios son `get_cu_form`, `submit_cu_form`, `get_cu_pending_reviews` y `claim_campaign_pilot_batch`. Otras cuatro diferencias de hash desaparecen con esa normalización. Vistas, triggers de usuario y secuencias: cero en ambos entornos. Los advisors temporales presentan las advertencias conocidas de funciones `SECURITY DEFINER` y RLS sin política cliente; 22 índices figuran sin uso porque el entorno está vacío. La pausa del proyecto temporal se confirmó con estado `INACTIVE`. El ensayo demuestra una brecha estructural concreta; no prueba por sí solo que sea seguro reparar versiones ni ejecutar migraciones históricas sobre QE2026.

**Evidencia posterior, separada de este primer ensayo:** el PR #34 construyó `supabase/baselines/qe2026-schema-only.sql` fuera de la cadena histórica y verificó su aplicación completa con guarda de proyecto vacío en otro temporal. Coincidieron los conteos de catálogo y los tipos generados con QE2026; se excluyeron intencionalmente dos filtros literales de `get_cu_pending_reviews()`, por lo que no se declaró paridad funcional total. El PR #33 sincronizó después el snapshot de tipos desde QE2026. Ambos PR quedaron fusionados en `main` el 2026-09-28. Esta evidencia cierra la subetapa de reproducción estructural aislada, pero no la conciliación de versiones ni la prueba funcional autenticada.

## Inventario de las 19 entradas sólo remotas

Segunda lectura de **sólo esquema e historial** en QE2026, sin leer filas de negocio. Se revisó el SQL registrado de cada entrada y se omitieron de este informe los literales, correos, UUID, tokens y payloads. Los nombres de objetos identifican el efecto histórico, no una instrucción para volver a ejecutarlo. `DML interno` indica código dentro de una función, que sólo cambia filas si la función se invoca; `backfill` indica una sentencia `UPDATE` de la propia migración.

| Versión | Objeto o efecto principal | Riesgo para un replay ingenuo |
| --- | --- | --- |
| `20260701140601` | Crea `cu_links` y habilita RLS | Ya absorbido por la baseline local. |
| `20260701140700` | Crea `cu_responses` y habilita RLS | Ya absorbido por la baseline local. |
| `20260701140823` | Políticas y grants iniciales de `cu_links`/`cu_responses` | Permisos históricos más amplios; no restablecerlos sobre RBAC. |
| `20260701141010` | Primera versión de `get_cu_form` | `SECURITY DEFINER` histórico, reemplazado después. |
| `20260701141127` | Grant de `get_cu_form` | Revisar junto con la versión final de la RPC. |
| `20260701141258` | Añade `cu_responses.payload` | Ya absorbido por la baseline local. |
| `20260701141447` | Primera versión de `submit_cu_form` | Contiene DML interno; reemplazada después. |
| `20260707001356` | Primera versión de `get_cu_pending_reviews` | Definición de revisión sustituida después. |
| `20260707001459` | Primeras versiones de aprobación/rechazo | Contienen DML interno sobre respuestas, empresas y contactos; sustituidas después. |
| `20260707001603` | Grants de revisión | No restaurar los permisos anteriores a RBAC. |
| `20260707003026` | Crea cuatro tablas de prospección | Ya absorbido por la baseline local. |
| `20260707003159` | Habilita RLS de prospección | Ya absorbido por la baseline local. |
| `20260707013441` | Amplía `contacts` | Ejecuta un **backfill** de contactos preexistentes. |
| `20260722031506` | Reemplaza `get_cu_form` con precarga de dos contactos | Cambio de función ausente de la reproducción local. |
| `20260722034019` | Añade `campaign_pilot_recipients.batch_key` | Ejecuta **backfill** antes de `NOT NULL` y de fijar el valor por defecto. |
| `20260722034030` | Cambia unicidades y check de lote; añade índice | Sustituye restricciones simples por compuestas; depende de `batch_key`. |
| `20260722034045` | Añade `claim_campaign_batch` y sus grants | RPC `SECURITY DEFINER` con DML interno; sólo `service_role` conserva `EXECUTE`. |
| `20260722142520` | Reemplaza `submit_cu_form` y `get_cu_pending_reviews` | Ejecuta **backfill** de `confirm_no_changes`; la función de cola contiene filtros por literales que requieren revisión antes de reproducirse. |
| `20260804203513` | Reemplaza `claim_campaign_pilot_batch` | DML interno y semántica de lote distinta a la versión local. |

Los 13 cambios de julio previos a la baseline no deben copiarse detrás de ella: recrearían objetos o permisos antiguos y repetirían un backfill. Los seis posteriores explican las diferencias estructurales y funcionales observadas. La [matriz de trazabilidad](../../MIGRATION-HISTORY-MATRIX.md) conserva ahora huellas LF y normalizadas de las 29 versiones remotas y los diez archivos locales, sin publicar SQL ni filas. Ocho pares tienen una huella normalizada igual y dos no; esto no prueba equivalencia semántica. La revisión funcional de los filtros literales y las pruebas sintéticas pertinentes siguen pendientes.

**Avance de sólo lectura (2026-09-28):** se comparó la función productiva con la baseline sin exponer los literales. La primera excluye por un token de enlace y un nombre de empresa exactos; la segunda no. Un conteo agregado de QE2026 encontró 12 respuestas `pendiente` elegibles por las uniones, ocho excluidas por ambos predicados (las mismas ocho) y cuatro devueltas por la función. El código de la aplicación consume la cola a través de `admin_get_cu_pending_reviews()`. No se estableció si las ocho son fixtures; quitar los filtros podría mostrar trabajo adicional al administrador. Véase la sección de impacto en [`AUDIT.md`](../../AUDIT.md). La decisión de producto y una eventual prueba autenticada sintética siguen abiertas; no se cambió la RPC, la baseline, los datos ni el historial.

**Decisión posterior D-031:** Pedro confirmó que las ocho respuestas son de ensayo y deben permanecer fuera de la cola real. La revisión agregada autorizada las asoció con una sola empresa etiquetada como prueba y un solo enlace; no devolvió valores individuales. La decisión cierra su clasificación de producto, pero no aprueba cambios de esquema, datos o RPC. Evaluar un mecanismo explícito, ensayarlo de forma aislada y publicarlo exigiría una decisión y un release separados; hasta entonces se mantienen los filtros productivos.

## Propuesta de decisión, sin ejecución

| Ruta | Qué entrega | Riesgo y reversibilidad |
| --- | --- | --- |
| **A. Reconstruir la historia remota en `supabase/migrations/`** | Versiones locales alineadas con las 29 remotas y flujo CLI convencional. | Exige rehacer o renombrar archivos históricos, resolver la baseline-marker, la allowlist con identidades y la migración con 31 contactos. Un `db push` antes de resolver cada diferencia puede ejecutar SQL viejo. Reversión mediante Git, pero una reparación del historial remoto necesitaría respaldo y procedimiento aparte. No se recomienda ahora. |
| **B. Baseline estructural nueva para entornos vacíos, conservando el legado** | Fuente sin datos reales cuyo objetivo es reproducir el catálogo actual, más futuros cambios *forward-only* separados. Los diez SQL existentes y las 29 entradas de QE2026 permanecen como evidencia histórica. | Necesita un archivo nuevo, comparación aislada completa y un procedimiento de publicación que no use todavía `db push` contra QE2026. Es reversible en Git mientras no se aplique remotamente. No resuelve por sí sola la discrepancia de versiones del CLI. |

**Ruta B aceptada en D-030, con límites:** la especificación, publicación y comparación de catálogo de la baseline estructural para entornos vacíos se completaron en el PR #34. La decisión conserva las 29 entradas remotas y los diez SQL locales sin reparación retroactiva, y exige releases SQL nuevos, individuales y revisados. La matriz de fingerprints cruzados y el procedimiento condicionado ya están documentados. Quedan pendientes el tratamiento funcional de los filtros literales, pruebas sintéticas autenticadas si se requieren y, para un SQL concreto, respaldo, recuperación, ensayo y dry-run que demuestre una sola versión. Ningún `db push`, `migration repair` o cambio en QE2026 queda autorizado. La [guía oficial](https://supabase.com/docs/guides/deployment/database-migrations) confirma que `migration repair` cambia la tabla de seguimiento, no el esquema.

## Archivos previstos

- Modificar tras la decisión aceptada: `docs/DECISIONS.md` y `docs/DATA-CONTRACTS.md` para la estrategia elegida y sus límites.
- Modificar, durante la investigación: `docs/AUDIT.md` para la matriz de evidencias y resultado del ensayo aislado.
- Potencialmente modificar, sólo tras inventario y aprobación adicional: `supabase/migrations/` o scripts de generación/reproducción. No se presupone que haya que crear 19 archivos ni alterar los diez existentes.
- No modificar: tablas, políticas, RPC, Auth, datos o historial de QE2026 durante este plan.

### Tarea 1: inventario verificable de historia y SQL

- [x] Registrar commit base, estado del árbol, diez nombres de archivo locales y las 29 versiones remotas con nombres, sin obtener datos personales.
- [x] Conservar hashes del SQL con saltos LF y de una normalización heurística en una [matriz revisable](../../MIGRATION-HISTORY-MATRIX.md), con diez pares locales/remotos y 19 entradas sólo remotas. No interpretar coincidencia de hash normalizado como prueba semántica.
- [x] Para baseline y allowlist, documentar la diferencia semántica exacta: marcador frente a reconstrucción, y siembra productiva retirada frente a provisionamiento por entorno. No volcar UUID ni correos al informe.
- [x] Contrastar el SQL RBAC remoto registrado con el archivo local de SHA-256 `E3333A7D9C394A6ADABB3E41A4D51BE5791A0BAF920B0797A5B8DDD45135FE1E`; la comparación textual normalizada a LF fue idéntica.
- [ ] Completar la revisión funcional de las entradas sólo remotas que afectan `get_cu_pending_reviews()` y otros contratos divergentes. La forma de los filtros, su impacto y la clasificación de las ocho respuestas (D-031), el inventario por objeto, tres backfills y las huellas cruzadas están documentados; faltan la decisión sobre el mecanismo futuro, los otros contratos divergentes y los casos sintéticos autenticados.

### Tarea 2: reproducción aislada y comparación de estado

- [x] Preparar un proyecto Supabase desechable distinto de QE2026 y confirmar dos veces su `project_ref`. No se usaron credenciales ni variables de pruebas autenticadas; las comprobaciones emplearon el conector con el ref temporal explícito.
- [x] Aplicar los primeros ocho archivos en orden, sólo el DDL de la novena migración y la décima RBAC al proyecto aislado. La excepción a la novena fue aprobada por Pedro para no copiar 31 contactos reales; por ello no se afirma haber reproducido literalmente los diez archivos.
- [x] Comparar esquema final del aislado con QE2026 mediante firmas de columnas, constraints, índices, funciones, RLS y grants, incluidos `batch_key`, unicidades compuestas y `claim_campaign_batch`.
- [x] Completar la pausa del proyecto temporal y comprobar `INACTIVE`. Ya se confirmó cero usuarios, membresías y filas CRM; no se ejecutaron pruebas autenticadas/mutantes porque requerirían credenciales y no ayudan a esta comparación de catálogo.

### Tarea 3: decisión de estrategia, sin ejecución implícita

- [x] Presentar las rutas A y B con sus riesgos históricos. Pedro eligió B después de la reproducción estructural aislada del PR #34; el inventario de versiones y objetos está arriba. La matriz de fingerprints cruzados quedó documentada; su actualización antes de cada release sigue siendo un gate de ejecución, no una condición retroactiva para esta elección documental.
- [x] Recomendar una opción sólo después de que la Tarea 2 pruebe reproducibilidad; la ruta B quedó aceptada con sus límites estructurales y funcionales explícitos.
- [x] Registrar la decisión estratégica en D-030, distinguiendo la conservación del historial de la autorización para desplegar.
- [x] Documentar en [`SUPABASE-RELEASE-PROCEDURE.md`](../../SUPABASE-RELEASE-PROCEDURE.md) el orden, las condiciones de parada y el gate de selección de una sola migración, sin habilitar ejecución productiva.
- [ ] Para un SQL nuevo y aprobado, repetir inventario de metadatos/hashes, preparar respaldo y recuperación, ensayar el cambio en un proyecto aislado y comprobar un dry-run que liste exclusivamente la nueva versión. Hoy no existe ese SQL, la CLI no está instalada y este gate sigue abierto.
- [ ] Solicitar autorización independiente antes de cualquier `migration repair`, cambio de archivos SQL históricos, nuevo servicio/dependencia o despliegue productivo. Nunca interpretar el visto bueno a este plan como autorización para esas acciones.

## Gate de decisión inmediato

Pedro confirmó la ruta B y sus límites generales el 2026-09-28; D-030 la registra. La baseline aislada y la sincronización de tipos están publicadas mediante los PR #34 y #33. La matriz de fingerprints y el procedimiento condicionado están documentados; la excepción por literales de la cola de revisión, el método productivo y un dry-run sobre un SQL nuevo no están resueltos. `db push` y `migration repair` siguen bloqueados, al igual que cualquier cambio productivo sin autorización específica.

## Criterio de cierre

La decisión, la matriz y el procedimiento preventivo están documentados. El plan operativo permanece abierto hasta verificar una vía de release con un SQL nuevo cuyo dry-run no reaplique migraciones históricas y resolver la paridad funcional necesaria. La reproducción estructural aislada y sus límites están documentados. El cierre documental no modifica por sí mismo el historial remoto.
