# Procedimiento condicionado para nuevos releases SQL de QE2026

**Estado: preparado documentalmente el 2026-09-28; no validado con una migración nueva ni autorizado para ejecutarse en producción.** Aplica D-030. QE2026 es `izbfawwmbilmsrdjaanw`. La [matriz de historia](./MIGRATION-HISTORY-MATRIX.md) registra 29 entradas remotas, diez archivos locales y cuatro archivos históricos cuya versión no figura remotamente. No modificar ninguna de esas entradas o archivos para desbloquear un release.

## Regla de parada

No ejecutar `db push`, `migration repair`, `apply_migration` ni SQL productivo por seguir este documento. La preparación y la ejecución son gates distintos. Si alguna comprobación no puede demostrar que **sólo un SQL nuevo y aprobado** sería aplicado, detenerse y presentar a Pedro un plan específico; nunca recurrir a `--include-all`, a una reparación de historia, al replay de la baseline o a un cambio manual de timestamps como atajo.

## 1. Preparar una entrega concreta

1. Obtener autorización para el cambio funcional/de esquema y delimitar exactamente su SQL, objetos afectados, RLS/grants, posible DML y efectos sobre datos existentes. No incluir identidades, correos, tokens ni filas de producción en Git.
2. Revisar un único artefacto SQL nuevo y su huella SHA-256 en un PR separado. Conservar los diez SQL históricos sin editar, renombrar o mover. Generar el nombre de migración con la CLI oficial **sólo si su instalación y uso están aprobados**; descubrir primero `--version` y `--help`. Una versión nueva no debe colisionar con ninguna versión remota o local.
3. Definir los criterios de aceptación, una reversión o recuperación ensayable y los cambios de tipos/frontend correspondientes. Si incluye DML, backfill, eliminación o permisos sensibles, obtener la autorización adicional prevista en `AGENTS.md`.

## 2. Congelar el punto de partida en modo de solo lectura

1. Confirmar dos veces por detalle/listado que el destino es **QE2026** y que su `project_ref` es `izbfawwmbilmsrdjaanw`; no confiar sólo en un proyecto previamente enlazado en la CLI.
2. Consultar únicamente versiones, nombres y huellas del historial. Compararlos con la [matriz](./MIGRATION-HISTORY-MATRIX.md): antes del primer release posterior a D-030 deben seguir las 29 versiones y sus huellas. Si otra operación cambió el historial, detenerse y actualizar la auditoría antes de continuar.
3. Documentar la disponibilidad real de backup/snapshot o recuperación a un instante previo y la persona que puede restaurarlo. No asumir que PITR está habilitado, no exportar datos productivos al repositorio y no seguir si no hay recuperación adecuada al riesgo del SQL.

## 3. Ensayar sin datos reales

1. Confirmar referencia, costo y aislamiento de un proyecto desechable **distinto** de QE2026; su creación y las pruebas mutantes necesitan autorización y variables `QE_TEST_*` conforme a `AGENTS.md`.
2. Inicializarlo sólo con la baseline protegida para proyectos vacíos; aplicar allí exclusivamente el SQL candidato. Comprobar esquema, RLS, grants, funciones, advisors y pruebas sintéticas pertinentes. La diferencia intencional de `get_cu_pending_reviews()` respecto a QE2026 no debe darse por resuelta por este ensayo.
3. Verificar que no quedaron identidades ni filas sintéticas; pausar o eliminar el proyecto tras el ensayo. Un ensayo exitoso no autoriza el paso productivo.

## 4. Demostrar la selección de una sola migración

La [CLI documenta](https://supabase.com/docs/reference/cli/supabase-db-push) que `db push --dry-run` imprime migraciones que se aplicarían y que `--include-all` incorpora las no encontradas en el historial remoto. **No se ha ejecutado un dry-run contra QE2026**: no hay un SQL nuevo aprobado y la CLI no está instalada en este entorno. Además, la comparación de versiones ya identifica cuatro SQL históricos locales con timestamps ausentes de QE2026; por eso no se presupone que el flujo convencional sea seguro.

Para un release concreto, primero seleccionar y documentar un mecanismo que pueda mostrar el destino, la versión y el **único** SQL candidato sin ejecutarlo. Si se evalúa la CLI, confirmar versión y ayuda, verificar el vínculo con QE2026 y usar sólo `--dry-run` con las opciones exactas revisadas. Si lista cualquier archivo histórico, más de una versión, un estado ambiguo o un error de historia, **no usar `db push` para ejecutar**. El dry-run no prueba por sí solo que el SQL sea correcto o reversible.

Si el árbol divergente impide ese gate, diseñar por separado una ejecución de una sola migración con una herramienta oficial, ensayar en el temporal cómo asigna versión y registra historial, y presentar el payload exacto y su huella antes de solicitar autorización. Una vista previa estática del payload o la prueba temporal no sustituyen silenciosamente el dry-run exigido por D-030; Pedro debe aprobar expresamente cualquier mecanismo alternativo y su evidencia equivalente. No hay alternativa aprobada en este documento.

## 5. Gate productivo independiente

Presentar juntos a Pedro: ref confirmado, diff/huella del SQL, inventario remoto actualizado, resultado del ensayo aislado, evidencia de selección de una sola migración, backup/recuperación disponibles, ventana operativa y plan de validación posterior. Esperar aprobación explícita para **ese release y ese mecanismo**. Ni la aprobación de D-030 ni la de este procedimiento bastan para ejecutarlo.

Después de una ejecución autorizada, comprobar que las 29 entradas anteriores conservan versión y huella, que apareció sólo la nueva versión esperada, y que el catálogo, permisos, tipos generados y pruebas del CRM corresponden al cambio aprobado. Registrar el resultado en `docs/AUDIT.md` y en el checklist de release. Ante un resultado incierto, no reintentar automáticamente ni reparar historia: preservar evidencia, evaluar recuperación y solicitar una decisión nueva.

## Situación al redactar este procedimiento

- Matriz de historia: preparada con huellas de 29 entradas remotas y diez archivos locales.
- SQL nuevo aprobado: ninguno.
- CLI Supabase disponible localmente: no se encontró; no se instaló nada.
- Dry-run productivo que seleccione sólo una nueva versión: **no realizado y no verificable todavía**.
- Backup/recuperación y método productivo de ejecución: por definir para cada release.
- Cambios en QE2026, en el historial o en datos por esta tarea: ninguno.
