# Catálogo mínimo aprobado — Fase 9, Etapa 3: métricas operativas

## Estado del documento

- Fecha: 2026-10-01.
- Estado: aprobada documentalmente por Pedro el 2026-10-01 mediante [D-032](../../DECISIONS.md); implementación no autorizada.
- Fuente de requisitos: `docs/PRD-CRM.md` §8, criterios `P9-MET-01..03`.
- Contexto operativo: preparar el CRM para uso comercial cotidiano sin ampliar ahora su alcance técnico.
- Tipo de entrega: diseño documental. No autoriza instrumentación, cambios de aplicación, consultas a Supabase, retención de datos ni alertas.

## 1. Objetivo y recomendación

Definir un conjunto mínimo de indicadores agregados que ayude a priorizar el trabajo diario sin hacer afirmaciones históricas que los datos actuales no pueden demostrar. Se aprueban tres snapshots accionables:

1. cobertura de empresas con al menos un contacto utilizable;
2. prospectos activos con al menos un contacto utilizable;
3. actividades de seguimiento vencidas.

Los tres son fotografías del estado actual, no tendencias ni evaluación de desempeño personal. No se fijan metas numéricas. Se posponen las métricas de primera gestión, conversión por periodo, formulario y errores críticos hasta acordar sus eventos/fuentes, acceso y política de privacidad.

## 2. Principios

- Medir sólo información agregada necesaria para ayudar a actuar en el CRM.
- No convertir estados actuales en eventos históricos; no inferir cuándo ocurrió un primer contacto o una conversión si no existe una marca temporal inequívoca.
- Separar etapa comercial, calidad del dato y clasificación conforme al contrato D-026.
- No mostrar rankings ni atribución a personas. La decisión del rol de la hermana sigue independiente.
- Los indicadores no guardan, corrigen, clasifican ni mutan registros automáticamente.
- No agregar SDK, proveedor, tabla, evento, log analítico, variable de entorno ni dependencia.

## 3. Catálogo mínimo aprobado

La granularidad inicial es una fotografía del conjunto visible en el momento de consulta. Las reglas y campos indicados son propuestas que deben contrastarse con el esquema remoto antes de cualquier implementación. El snapshot local de `database.types.ts` no sustituye esa comprobación.

| ID / nombre | Fórmula aprobada | Fuente y granularidad | Frecuencia / zona horaria | Acción aprobada |
| --- | --- | --- | --- | --- |
| MET-D01 — Cobertura de empresas con contacto utilizable | Empresas con al menos un contacto vinculado cuyo nombre no esté vacío y que tenga email válido o teléfono válido ÷ empresas del conjunto actual no eliminadas. Mostrar numerador y denominador junto al porcentaje; denominador cero = “sin base”, no 0%. Como la eliminación lógica aún no está implementada, hoy el denominador definido son todas las filas de empresa visibles. | `companies` + `contacts`, relación `contacts.company_id`; snapshot global agregado, sin desglose por empresa o usuario. “Utilizable” sigue D-026 §7: email válido o teléfono con al menos 7 dígitos normalizados. | Revisión diaria al abrir el CRM; snapshot, no serie temporal. Sin cálculo dependiente de hora local. | Abrir la vista de empresas/contactos incompletos y completar manualmente; no crear ni editar datos desde el indicador. |
| MET-D02 — Prospectos activos con contacto utilizable | Prospectos en etapas activas canónicas con al menos un `prospect_contact` que tenga nombre y email válido o teléfono válido ÷ prospectos activos canónicos. Mostrar cantidad y porcentaje; base vacía = “sin base”. Etapas activas de D-026 §5.1: `nuevo`, `por_gestionar`, `contactado`, `interesado`, `cotizacion_enviada`; excluir `convertido` y `descartado` sólo cuando el contrato/código resuelva su representación. La clasificación se mantiene separada de la etapa y no cambia el denominador por sí sola. | `prospects` + `prospect_contacts`, relación `prospect_contacts.prospect_id`; snapshot global agregado. | Revisión diaria; snapshot, no serie temporal. Sin cálculo dependiente de hora local. | Abrir la lista de prospectos y filtrar los que no tienen contacto utilizable; la selección de prospectos sigue siendo humana. |
| MET-D03 — Seguimientos vencidos abiertos | Conteo de actividades de empresa y prospecto con fecha prevista anterior al día actual en `America/Bogota`, sin completar, y cuyo tipo sea acción de seguimiento, no nota. Mostrar total y, como navegación, su lista operativa existente; nunca copiar notas al evento métrico. | `activities` + `prospect_activities`; una fila por actividad elegible, agregado total por snapshot. `due_date` es fecha civil. Aprobación de tipo, nulabilidad y semántica de `completed` requiere contraste con el esquema remoto. | Al abrir/refrescar el CRM y al inicio de jornada comercial colombiana; corte de día `America/Bogota`. No almacenar lecturas anteriores. | Revisar y completar o reprogramar cada seguimiento desde sus controles actuales; no cambiar fechas automáticamente. |

### Definición de contacto utilizable

La regla sigue el contrato funcional aprobado en D-026 §7: nombre completo no vacío y por lo menos un canal válido. Un email informado debe pasar validación de email; un teléfono debe tener siete o más dígitos después de normalizarlo. Si hay ambos canales y uno es válido, basta el canal válido. La aplicación actual no aplica exactamente esta regla en todos sus puentes; por tanto, ésta es la definición aprobada para una unidad de implementación posterior, no una afirmación de que el indicador ya se calcula de forma consistente.

### Límites de interpretación

- MET-D01/02 describen cobertura actual, no calidad comercial completa ni probabilidad de venta.
- MET-D02 no puede activarse con una lectura literal del estado actual sin reconciliar el contrato D-026 con los estados persistidos; `docs/AUDIT.md` ya registra la diferencia de `por_validar` y el estado dual calidad/etapa.
- MET-D03 requiere que las consultas cubran el conjunto completo. La aplicación tiene límites de lectura documentados y aún debe escalar con paginación antes de tratar el total como exacto sobre una base mayor.
- Si falla una fuente, la interfaz debe mostrar “no disponible” y el error saneado; nunca sustituirlo por cero.
- Ningún ratio debe usarse para comparar a personas o establecer incentivos.

## 4. Otras métricas del PRD: pospuestas por falta de base aprobada

| Frente del PRD | Por qué no se incluye en el catálogo diario mínimo | Evidencia o decisión requerida antes de proponer una fórmula operativa |
| --- | --- | --- |
| Primera gestión | `created_at` y las actividades disponibles no acreditan por sí solos el primer contacto real; datos importados pueden preceder al uso del CRM. | Definir si “gestión” significa actividad registrada, actividad completada o contacto externo realizado; distinguir importaciones y definir ventana/cohorte. |
| Conversión | El estado actual o `converted_company_id` permite reconocer ciertos registros convertidos, pero no establece de forma confiable un evento y fecha de conversión para análisis por periodo ni resuelve los estados legados. | Contrastar estados/RPC vigentes, resolver contrato/código y definir cohorte, ventana, exclusiones y correcciones. |
| Formularios de actualización | La cola de revisión es una capacidad administrativa; una proporción de respuesta requiere decidir población de enlaces elegibles, vencidos, reenvíos y relación con respuestas. | D-027, D-031, RPC/esquema comprobados y matriz de acceso por rol; sólo presentar agregados autorizados. |
| Errores críticos | No se localizó una fuente agregada aprobada que distinga severidad y permita contar fallos sin retener mensajes con datos personales o secretos. | Definir taxonomía, sanitización, responsable de incidentes, acceso, retención y respuesta; revisión de privacidad antes de cualquier logging. |

No se propone un “total de envíos de campaña” como KPI. El piloto de correo se declaró completado y la existencia de su ruta no autoriza nuevos lotes.

## 5. Responsabilidad, frecuencia, objetivos y respuesta

- **Dueño del catálogo y aprobación de producto:** Pedro, según el PRD vigente.
- **Operador cotidiano:** pendiente; se asigna después de acordar el acceso y rol de la hermana. Este documento no crea ni modifica ese acceso.
- **Frecuencia aprobada:** consultar snapshots D01–D03 diariamente cuando se opera el CRM; no automatizar alertas ni enviar reportes.
- **Objetivos/umbrales:** no fijados. No hay baseline contemporánea verificada ni meta aprobada. Primero se necesita aceptación de fórmulas y un mecanismo explícito de captura; la definición de objetivos será una decisión posterior basada en datos suficientes, no en números inventados.
- **Respuesta operativa:** abrir los registros correspondientes y decidir manualmente. Un indicador no dispara actualizaciones ni limpieza masiva.

Por ello `P9-MET-02` queda abierto: Pedro es responsable del catálogo de producto y están propuestas frecuencia y acción, pero el operador cotidiano y los objetivos/umbrales requieren decisión posterior.

## 6. Privacidad, acceso, retención y alertas

Política aprobada por D-032 como requisito previo a cualquier instrumentación:

- mostrar sólo conteos y porcentajes agregados; no incluir nombres, emails, teléfonos, NIT, UUID, tokens, payloads, notas ni datos por empleado;
- no crear eventos de navegación, perfilado, tracking de personas o proveedor de analítica;
- usar únicamente el acceso CRM que ya tenga el usuario para las tablas que originan cada indicador; un fallo de autorización no se elude con otra credencial o endpoint;
- no persistir snapshots, históricos métricos ni logs nuevos; esta política no cambia la retención de los datos CRM fuente;
- no habilitar alertas ni reportes automáticos;
- cuando una futura necesidad exija historial o alertas, aprobar por separado finalidad, campos mínimos, acceso, retención, borrado, canal y propietario antes de implementar.

Pedro aprobó estas reglas de privacidad, acceso, retención y alertas como condición preventiva de producto mediante D-032. `P9-MET-03` queda aceptado como política antes de instrumentar; esta aceptación no autoriza telemetría. Cualquier mecanismo futuro requiere revisión concreta y un gate de implementación independiente.

## 7. Gating para una implementación futura

Antes de implementar cualquier indicador:

1. Confirmar que D-032 sigue vigente; cualquier ampliación del catálogo, meta o evento requiere decisión de producto separada.
2. Contrastar tablas, relaciones, RLS/RPC y semántica de fechas con el esquema remoto vigente; no inferirlas únicamente desde `database.types.ts`.
3. Verificar que la paginación/total sea completo y que errores de consulta no aparezcan como cero.
4. Escribir pruebas locales para fórmula, canales inválidos, denominador cero, estados excluidos, notas/actividades, límites de fecha y error de fuente.
5. Si se requiere consultar formularios, Auth/RLS/RPC o datos, abrir un gate separado y mantener cualquier prueba mutante aislada conforme a `AGENTS.md`.
6. Revisar privacidad, acceso, retención y los objetivos antes de añadir persistencia, telemetría o alertas.
7. Presentar plan técnico independiente y obtener autorización de implementación. Esta especificación no aprueba cambios funcionales.

## 8. Evidencia local consultada

- Requisitos vigentes: [PRD CRM §8](../../PRD-CRM.md) y [D-026](./2026-07-21-phase-9-commercial-contract-design.md).
- Columnas consultadas por el dashboard: [`queryColumns.ts`](../../../src/lib/data/queryColumns.ts) y [`crmDashboardRepository.ts`](../../../src/lib/data/crmDashboardRepository.ts).
- Contadores actuales de inicio y prospectos: [`page.tsx` del dashboard](../../../src/app/page.tsx), [`page.tsx` de prospección](../../../src/app/prospectos/page.tsx) y [`page.tsx` de detalle de lista](../../../src/app/prospectos/%5BlistId%5D/page.tsx).
- Reglas locales de calidad y vencimiento: [`prospectOperations.ts`](../../../src/lib/prospectOperations.ts) y [`dashboardModel.ts`](../../../src/features/crm/dashboardModel.ts).

Las referencias locales describen código inspeccionado, no el estado actual de QE2026, la completitud de las filas remotas ni la exactitud de los conteos por encima del límite de lectura configurado.

## 9. Reversión documental

Si se rechaza, retirar únicamente esta propuesta y cualquier enlace que se haya añadido a ella. No revertir ni modificar decisiones aceptadas, código, esquema, datos o permisos como parte de esa revisión.
