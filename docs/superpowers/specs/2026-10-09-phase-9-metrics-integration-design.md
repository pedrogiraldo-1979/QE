# Diseño aprobado — integración de métricas D01/D03

Pedro aprobó en este chat el 2026-10-09 lecturas paginadas de sólo lectura y dos tarjetas en Inicio, con comprobación de esquema, sin escrituras ni publicación productiva. Se ejecuta sobre `codex/phase-9-metrics-kernel`, después de `d956ac8`. PR #49 permanece separado.

## Alternativas y elección

Se elige lectura cliente paginada con campos mínimos, permisos existentes y núcleo D-032. Una RPC agregada permitiría otra estrategia de consistencia, pero exigiría diseño y gate de backend; no se implementa. Reutilizar listas posiblemente truncadas del dashboard no permite demostrar completitud y se rechaza.

## Arquitectura

- Repositorio independiente de cuatro fuentes: empresas (`id`), contactos (`id,company_id,full_name,email,phone`), actividades de empresa y prospecto (`id,activity_type,due_date,completed`). No leer notas ni datos administrativos.
- Páginas de 500 filas, ordenadas por `id`, hasta 20 páginas por fuente; conteo exacto coherente entre páginas, IDs únicos, longitud esperada y ausencia de errores. Un conteo ausente, cambio de población detectado, truncamiento, presupuesto excedido o fallo produce indisponibilidad. No hay reintento automático.
- La paginación no es una transacción entre tablas: igualdad de conteos no demuestra ausencia de ediciones simultáneas. La interfaz debe indicar lectura al refrescar, no instantánea transaccional; no prometer totales en tiempo real.
- Adaptación cerrada: `note` es nota; `call`, `email`, `whatsapp`, `follow_up`, `meeting` son acciones conforme al catálogo de tipos usado por la interfaz existente. Un tipo desconocido invalida esa fuente. `completed: null` no se convierte a falso; se conserva la indisponibilidad preventiva del núcleo para una acción fechada.
- Controlador por instancia: cancelar petición anterior, límite temporal de 15 segundos, descartar respuestas antiguas, limpiar al deshabilitar/cerrar sesión y desmontar. Ningún caché global, almacenamiento o log.
- Hook nuevo sólo activo con sesión/autorización listas y vista Inicio; escucha cambios de Auth únicamente para invalidar datos y recargar con autorización vigente, sin modificar Auth. Refrescar ejecuta la carga existente y la nueva; el fallo métrico no bloquea el dashboard.
- Dos tarjetas reutilizando estilos existentes: cobertura con numerador/denominador/porcentaje o “Sin base”; vencidos con corte Colombia. “Cargando” y “No disponible” nunca representan cero. Sustituir sólo el antiguo indicador superior de vencidos, no la agenda. Aclarar que el acceso heredado de HomePanel cuenta actividades de clientes cargadas, no el total D03.

## Contraste de esquema autorizado

Proyecto QE2026 identificado y saludable; cuatro tablas con RLS habilitado y políticas SELECT para authenticated observadas. Tipos regenerados en memoria: los cuatro contratos Row coinciden exactamente con el snapshot local. `due_date` es `date` nullable; `activities.completed` boolean nullable, `prospect_activities.completed` boolean no nullable; `activity_type` text no nullable, sin CHECK de catálogo observado. No se leyeron filas ni distribuciones de valores. La futura lectura cliente respeta RLS; este contraste de metadatos no acredita una prueba autenticada ni la población real.

## Verificación y límites

Pruebas locales de paginación, fuentes vacías/erróneas/parciales, conteos cambiantes, IDs repetidos, abortos y respuestas fuera de orden; render real de tarjetas con React DOM Server y wiring de la ruta. Typecheck, suite, build, smoke de producción local y revisión no autenticada del bundle. No crear cuentas o fixtures Supabase; una aceptación autenticada remota requiere un gate separado y entorno desechable.

Sin métricas de prospectos, metas, telemetría, históricos, dependencias, variables nuevas, SQL, RPC, RLS, permisos o cambios de datos. Fase 9 sigue abierta. Reversión: retirar consumidor/repository/hook/controlador/tarjetas de esta unidad y conservar el núcleo local; no revertir código ajeno ni datos.
