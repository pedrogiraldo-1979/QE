# Registro de cierre y pendientes de Fase 9

Corte: 2026-10-09. Baseline funcional publicado: `361f63b`, [PR #48](https://github.com/pedrogiraldo-1979/QE/pull/48). Este registro organiza el cierre; no declara la Fase 9 terminada.

## Dos pendientes reservados a Pedro

| Pendiente | Evidencia necesaria | Límites |
| --- | --- | --- |
| Aceptación con la hermana | Sesión guiada según [guía diaria](./CRM-DAILY-USE.md), identidad/rol ya acordados comprobados al entrar, comprensión y resultado de los recorridos. | No se crean cuentas ni se cambian permisos; no se prueba escritura productiva sin alcance acordado. Incluye acordar el operador cotidiano de métricas cuando se habiliten. |
| Android Chrome / PR #44 | Confirmar URL, dispositivo y resultado visible del alta de prospectos; distinguir protección de Vercel de una pantalla vacía de la aplicación. | Pendiente conservado a petición de Pedro. Viewport local no equivale a dispositivo real; no se fusiona #44 por este documento. |

## Trabajo del agente y estado comprobable

| Frente | Estado | Evidencia / siguiente paso |
| --- | --- | --- |
| Guardados de prospectos y contactos | Publicado | #48, 141 pruebas, CI de main y Vercel Ready; smoke público 13/13. Persistencia ensayada sólo con sintéticos aislados. |
| PR #45–47 | Cerrados como incorporados | Sus cambios están en #48; ramas e historial conservados, sin nuevo merge. |
| PR #30 | Cerrado como sustituido | No se fusionó la propuesta de siete métricas/cierre de Etapa 3; rigen D-032 y ACCEPTANCE-COVERAGE. |
| PR #38 | Reconciliación documental preparada | Se preserva su lectura histórica del 2026-09-30, separada del reporte posterior de archivo cifrado validado. La integración y cualquier release SQL mantienen sus gates. |
| Documentación vigente | Actualizada en esta rama | Roadmap, auditoría y cobertura reflejan #48; guía operativa y plan de cierre preparados. No se consideran publicados hasta integrar este PR documental. |
| Métricas | Definición mínima aprobada; operación no implementada | Tres snapshots D-032, sin metas, nuevos logs ni históricos. No presentar los contadores existentes como fórmulas equivalentes. Ver plan de cierre documental. |

## Trabajo técnico que no desaparece por ordenar el cierre

Los siguientes puntos conservan el estado y los gates existentes. No están implementados ni aceptados como cerrados; tampoco se aprueba aquí retirarlos de Fase 9. Para dejar sólo dos pendientes del primer uso, hay que distinguir aceptación comercial de cierre completo de fase.

| Unidad | Condición previa y salida verificable | Responsable técnico |
| --- | --- | --- |
| MET-D01–D03 | Contrastar esquema/estados y completitud de fuentes, plan funcional propio, pruebas de fórmulas y errores. Medir línea base antes de proponer metas; no inferir históricos. | Agente prepara diseño; Pedro aprueba mecanismo y objetivos. |
| Auditoría / eliminación lógica / restauración | Plan por entidad con retención, actor, atomicidad de lote, RLS y recuperación; ensayo desechable y release SQL individual D-030. No habilitar borrado sin restauración ensayada. | Agente prepara y verifica; gate sensible de Pedro. |
| Ciclo público / filtro de pruebas | Respetar D-027/D-031, una respuesta por ciclo, no reapertura, sin cambiar los registros de ensayo. No desplegar is_test ni alterar filtros por existir una migración en Git. | Gate SQL individual D-030. |
| Bridges restantes | Inventario actual, autorización de una sustitución concreta, equivalencia funcional/visual/accesible y rollback. No retirada masiva ni reorganización de rutas. | Agente, tras aprobar unidad. |
| Recuperación y selección de SQL | Archivo cifrado validado no equivale a restauración ensayada. Antes de un SQL nuevo, demostrar recuperación adecuada y selección exclusiva de esa versión; sin repair ni replay histórico. | Agente prepara evidencia; Pedro autoriza release concreto. |

## Orden recomendado sin ampliar el MVP

1. Publicar y revisar la reconciliación exclusivamente documental, sin nuevas funcionalidades ni merge automático.
2. Completar los dos pendientes humanos por separado cuando Pedro esté disponible.
3. Para el cierre completo de Fase 9, decidir explícitamente por cada unidad técnica anterior entre ejecutar su plan con gates propios o trasladarla al backlog. No convertir una propuesta de aplazamiento en decisión aceptada ni pedir aprobar todos los gates sensibles como un bloque.

La preparación para uso comercial básico y el cierre total de Fase 9 son hitos distintos. No se crea ERP, telemetría, una dependencia, una variable de entorno ni una autorización de Supabase mediante este registro.
