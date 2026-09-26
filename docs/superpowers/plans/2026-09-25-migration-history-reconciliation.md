# Conciliación del historial de migraciones — plan de investigación y decisión

> **Para agentes:** usar `executing-plans` para los pasos documentales. No delegar en subagentes salvo petición expresa de Pedro. Ninguna casilla de este plan autoriza ejecutar `migration repair`, `db push`, SQL remoto ni borrar archivos.

**Objetivo:** establecer una correspondencia auditable entre el historial de QE2026 y `supabase/migrations/`, y elegir una vía segura para futuros despliegues sin repetir SQL histórico ni alterar datos.

**Arquitectura:** primero inventariar versiones y contenido con acceso de solo lectura; después probar la reproducibilidad del esquema en un proyecto desechable; por último presentar alternativas de historia canónica y solicitar una decisión específica antes de tocar metadatos remotos o archivos SQL.

**Tecnología:** Supabase PostgreSQL, migraciones SQL versionadas, CLI oficial cuando esté disponible, pnpm para verificaciones del repositorio.

## Restricciones globales

- Producción: QE2026 (`izbfawwmbilmsrdjaanw`), sólo lectura durante este plan. Confirmar `project_ref` en cada sesión.
- No ejecutar `supabase db push`, `migration repair`, `db pull` con confirmación de historia, `apply_migration`, DDL ni DML en producción. Según la [referencia de Supabase](https://supabase.com/docs/reference/cli/supabase-migration-repair), `repair --status applied` inserta registros y `--status reverted` los elimina del historial; ninguna operación equivale a aplicar o revertir el esquema.
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

Revalidación de solo lectura posterior: los cuatro pares incrementales de misma versión, los tres pares de timestamps distintos y RBAC coinciden al normalizar comentarios y espacios. Siete de los ocho también coinciden como texto normalizado a LF; el octavo (`20260720031715`) sólo tiene un comentario local adicional. El SQL RBAC remoto coincide textualmente con el archivo local de SHA-256 `E3333A7D9C394A6ADABB3E41A4D51BE5791A0BAF920B0797A5B8DDD45135FE1E`. La baseline y la allowlist no son equivalentes; el contenido de la siembra de membresías no se publicó ni imprimió.

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

## Archivos previstos

- Modificar, sólo tras decisión: `docs/DECISIONS.md` y `docs/DATA-CONTRACTS.md` para la estrategia elegida y sus límites.
- Modificar, durante la investigación: `docs/AUDIT.md` para la matriz de evidencias y resultado del ensayo aislado.
- Potencialmente modificar, sólo tras inventario y aprobación adicional: `supabase/migrations/` o scripts de generación/reproducción. No se presupone que haya que crear 19 archivos ni alterar los diez existentes.
- No modificar: tablas, políticas, RPC, Auth, datos o historial de QE2026 durante este plan.

### Tarea 1: inventario verificable de historia y SQL

- [x] Registrar commit base, estado del árbol, diez nombres de archivo locales y las 29 versiones remotas con nombres, sin obtener datos personales.
- [ ] Conservar hashes del SQL original y normalizado en una matriz revisable. La revalidación comparó ya el contenido de los cuatro pares de misma versión y los tres pares de distinto timestamp, pero aún no produjo esa matriz de hashes.
- [x] Para baseline y allowlist, documentar la diferencia semántica exacta: marcador frente a reconstrucción, y siembra productiva retirada frente a provisionamiento por entorno. No volcar UUID ni correos al informe.
- [x] Contrastar el SQL RBAC remoto registrado con el archivo local de SHA-256 `E3333A7D9C394A6ADABB3E41A4D51BE5791A0BAF920B0797A5B8DDD45135FE1E`; la comparación textual normalizada a LF fue idéntica.
- [ ] Completar la revisión de las 19 entradas sólo remotas por objeto, DML de nivel superior, identidades y dependencias de entorno. La primera pasada detectó tres backfills históricos al separar cuerpos de funciones; aún falta una matriz revisable y un examen manual del SQL completo antes de dar por exhaustivo el inventario.

### Tarea 2: reproducción aislada y comparación de estado

- [x] Preparar un proyecto Supabase desechable distinto de QE2026 y confirmar dos veces su `project_ref`. No se usaron credenciales ni variables de pruebas autenticadas; las comprobaciones emplearon el conector con el ref temporal explícito.
- [x] Aplicar los primeros ocho archivos en orden, sólo el DDL de la novena migración y la décima RBAC al proyecto aislado. La excepción a la novena fue aprobada por Pedro para no copiar 31 contactos reales; por ello no se afirma haber reproducido literalmente los diez archivos.
- [x] Comparar esquema final del aislado con QE2026 mediante firmas de columnas, constraints, índices, funciones, RLS y grants, incluidos `batch_key`, unicidades compuestas y `claim_campaign_batch`.
- [x] Completar la pausa del proyecto temporal y comprobar `INACTIVE`. Ya se confirmó cero usuarios, membresías y filas CRM; no se ejecutaron pruebas autenticadas/mutantes porque requerirían credenciales y no ayudan a esta comparación de catálogo.

### Tarea 3: decisión de estrategia, sin ejecución implícita

- [ ] Presentar a Pedro la matriz completa y dos alternativas con impacto reversible: (A) preservar la historia remota y crear una representación local auditada/reproducible, sin copiar datos; (B) definir una nueva baseline estructural para proyectos vacíos y mantener el historial remoto como legado documentado. Precisar cómo cada opción trataría las 19 entradas, los cuatro timestamps distintos y las dos discrepancias de SQL.
- [ ] Recomendar una opción sólo después de que la Tarea 2 pruebe reproducibilidad; si ninguna la prueba, mantener bloqueado el despliegue general y seguir usando sólo releases SQL individuales con aprobación explícita.
- [ ] Registrar la decisión aceptada en `docs/DECISIONS.md`, junto con respaldo de metadatos, procedimiento de reversión y un dry-run verificable que liste exclusivamente la próxima migración nueva.
- [ ] Solicitar autorización independiente antes de cualquier `migration repair`, cambio de archivos SQL históricos, nuevo servicio/dependencia o despliegue productivo. Nunca interpretar el visto bueno a este plan como autorización para esas acciones.

## Gate de decisión inmediato

Pedro ya confirmó el proyecto temporal y su costo indicado; queda elegir la estrategia de historia una vez revisada esta comparación aislada. Hasta entonces, `db push` y `migration repair` siguen bloqueados. La sincronización de tipos tiene un plan y un PR independientes.

## Criterio de cierre

Existe una matriz local/remoto revisada, una reproducción aislada verificable o una limitación explícita, una decisión registrada y una vía de release cuyo dry-run no reaplica migraciones históricas. El cierre documental no modifica por sí mismo el historial remoto.
