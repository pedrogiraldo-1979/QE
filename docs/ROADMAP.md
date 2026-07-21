# Roadmap de reorganización

## Principios

- Conservar primero el comportamiento; mejorar la estructura en pasos pequeños.
- Separar cambios documentales, estructurales, funcionales y de datos.
- No borrar ni mover duplicados sin aprobación explícita.
- No modificar Supabase o datos como efecto secundario de una reorganización.
- Cada etapa debe tener evidencia, criterio de salida y ruta de reversión.

## Fase 0 — Documentación e inventario (actual)

Objetivo: establecer una base compartida sin modificar el producto.

Entregables:

- `AGENTS.md` con reglas operativas;
- PRD de Fase 1;
- roadmap por gates;
- registro de decisiones;
- auditoría estructural y de riesgos.

Criterio de salida:

- documentos revisados por el responsable;
- preguntas abiertas priorizadas;
- aprobación o correcciones al plan técnico.

## Fase 1 — Baseline técnico local (completado)

Objetivo: comprobar qué se ejecuta realmente antes de reorganizar.

Trabajo completado:

1. typecheck aprobado;
2. build de producción aprobado;
3. rutas inventariadas verificadas por HTTP local sin mutar datos;
4. manifests y source maps inspeccionados;
5. `src/` confirmado como fuente del build local;
6. diferencias de dependencias y ausencia de lockfile registradas;
7. riesgos semánticos, de integridad y aislamiento documentados.

Pendiente: la instalación todavía no es reproducible, no se navegó con backend real y no se verificó el despliegue remoto.

Gate actual: aprobar el baseline y `src/` como fuente canónica. No se elimina nada automáticamente.

## Fase 2 — Estabilización prioritaria (frontend y backend mínimo completados)

Objetivo: resolver riesgos de integridad antes de una refactorización amplia.

Completado:

1. pnpm 11.7.0, Node recomendado y lockfile registrados;
2. campos y estados frontend de prospectos unificados;
3. pruebas puras para normalización, conversión, contactos y duplicados;
4. bridges internos aislados mediante carga dinámica por ruta;
5. consulta global innecesaria de `companies` eliminada;
6. sesión/autenticación interna centralizada;
7. typecheck, pruebas, build y smoke de scripts públicos aprobados;
8. esquema, RLS, funciones, permisos, migraciones e índices remotos auditados;
9. conversión y eliminación de prospectos trasladadas a RPC transaccionales e idempotentes;
10. RPC internas retiradas de `anon` y ejecutadas como `SECURITY INVOKER`;
11. formulario público alineado con vencimiento de token y límites de payload;
12. índices de las nueve claves foráneas señaladas por el advisor creados.

Pendiente para cerrar seguridad y validación funcional:

1. decidir si se migran las 220 filas con estado legado `por_validar` a `por_revisar`; el frontend ya las normaliza sin reescribir datos;
2. habilitar protección de contraseñas filtradas desde Auth;
3. ejecutar pruebas funcionales autenticadas y pruebas de mutación en un entorno controlado;
4. definir auditoría y recuperación para eliminaciones antes de ampliar el uso;
5. diferenciar permisos de `admin` y `member` solo cuando producto defina qué acciones deben reservarse.

Autorización completada: allowlist privada para las dos cuentas internas existentes, RLS aplicado a las nueve tablas, privilegios anónimos directos revocados y comprobación de acceso integrada en la sesión frontend.

Gates independientes:

- cambios de frontend funcional requieren aprobación de alcance;
- inspección o modificación de Supabase requiere autorización expresa;
- cualquier prueba que mute datos debe usar un entorno controlado.

## Fase 3 — Resolución controlada de duplicados (completada)

Objetivo: retirar ambigüedad entre raíz y `src/`.

Candidatos identificados:

- `page.tsx` / `src/app/page.tsx`;
- `layout.tsx` / `src/app/layout.tsx`;
- `globals.css` / `src/app/globals.css`;
- `supabase.ts` / `src/lib/supabase.ts`;
- `types.ts` / `src/lib/types.ts`.

Plan propuesto:

1. comparar comportamiento, historial e importaciones de cada par;
2. confirmar configuración real de Next.js y despliegue;
3. seleccionar la fuente canónica por decisión registrada;
4. trasladar cualquier diferencia todavía necesaria mediante un commit separado;
5. verificar typecheck, build y rutas;
6. presentar el diff final;
7. eliminar los archivos redundantes solo tras una segunda aprobación.

Reversión: commits atómicos, sin mezcla con cambios funcionales.

Estado de la auditoría:

- los cinco pares fueron comparados por contenido, imports, historial, TypeScript, build, source maps y despliegue;
- no se encontró funcionalidad única en las copias raíz que deba trasladarse;
- `src/` está confirmado como fuente canónica local y desplegada;
- el plan exacto está en `docs/PHASE-3-DUPLICATES.md`;
- Pedro autorizó explícitamente el retiro de los cinco archivos;
- las cinco copias raíz fueron eliminadas juntas, sin trasladar contenido ni modificar `src/`;
- TypeScript dejó de incluir las cuatro copias TS/TSX;
- typecheck, 6/6 pruebas, build de 10 rutas, manifest y source maps conservaron el baseline canónico.

Resultado: el gate técnico y la aprobación explícita quedaron satisfechos. La reversión consiste en revertir únicamente el commit estructural de limpieza.

## Fase 4 — Modularización de interfaz (corte estructural completado)

Objetivo: reducir acoplamiento y tamaño de páginas sin cambiar reglas de negocio.

Orden sugerido:

1. extraer constantes, formatters y validaciones puras;
2. extraer hooks de lectura y mutación por dominio;
3. dividir vistas de empresas, contactos, actividades y prospectos;
4. reemplazar bridges basados en manipulación del DOM por composición React donde sea viable;
5. consolidar estilos por capa y retirar parches solo con equivalencia visual comprobada.

Criterios de salida:

- ninguna regresión en la matriz de flujos;
- límites claros entre UI, lógica de dominio y acceso a datos;
- archivos principales reducidos a responsabilidades coherentes.

Trabajo completado:

1. tipos de vista, constantes, formatters, filtros y validaciones puras extraídos a `src/features/crm/dashboardModel.ts`;
2. carga del dashboard y revisión de respuestas extraídas a `src/hooks/useCrmDashboardData.ts`, sin cambiar tablas ni RPC;
3. vistas de empresas, contactos, actividades, prospectos, calidad y respuestas separadas en componentes de `src/components/crm/`;
4. botón global Agregar, navegación a Prospección y alta de contacto desde cliente reemplazados por composición React/Next directa;
5. `src/app/page.tsx` reducido de 2.375 a 1.498 líneas;
6. cinco pruebas puras nuevas añadidas; baseline total elevado de 6 a 11 pruebas.

Deuda controlada:

- permanecen cinco bridges complejos asociados a workbenches, portales y edición rápida;
- no se consolidaron ni retiraron parches CSS porque falta una comparación visual autenticada;
- esos dos puntos requieren el gate visual/funcional de Fase 6, no cambios de Supabase.

## Fase 5 — Contratos y capa de datos (primer corte completado)

Objetivo: alinear tipos y acceso a datos con el backend real.

Trabajo completado:

- tipos TypeScript generados desde el proyecto remoto y cliente Supabase tipado con `Database`;
- tipos de dominio derivados de las filas remotas, conservando sólo compatibilidad explícita de lectura;
- dashboard y revisión de respuestas centralizados en un repositorio de datos;
- todos los `select("*")` sustituidos por contratos de columnas compartidos;
- límites dispersos sustituidos por límites nombrados y documentados;
- RPC, RLS, Auth, grants, advisors y Edge Function documentados en `docs/DATA-CONTRACTS.md`;
- argumento de revisión corregido a `p_response_id` según el contrato remoto;
- rechazo de respuestas endurecido para permitir únicamente la transición desde `pendiente`.

Deuda controlada:

- paginación antes de superar 1.000 entidades por dominio;
- repositorios adicionales para mutaciones que aún pertenecen a rutas específicas;
- decisión separada sobre múltiples respuestas por enlace público, porque el baseline contiene ocho respuestas de prueba para un mismo enlace;
- protección de contraseñas filtradas y eventual migración del estado `por_validar` continúan pendientes.

Gate de Supabase: autorizado por Pedro al continuar la Fase 5. La única migración de esta fase reemplazó una función y no modificó filas.

## Fase 6 — Calidad y operación (gate autenticado completado)

Objetivo: hacer el sistema seguro de evolucionar y operar.

Trabajo completado:

- 16 pruebas nativas de Node para reglas puras, contratos críticos de datos y presencia de la baseline;
- barreras contra deriva de tablas/RPC, regreso de `select("*")`, argumentos RPC incorrectos y relajación de la transición de rechazo;
- smoke HTTP reproducible para ocho rutas y una respuesta `404`;
- CI en GitHub Actions con instalación congelada, typecheck, pruebas, build y smoke del servidor de producción;
- verificación de hidratación, consola, semántica básica y overflow en escritorio y móvil para el login y la superficie pública sin token;
- variables públicas de Supabase presentes durante el build de CI, tras comprobar que inyectarlas sólo al iniciar no hidrata el bundle;
- checklist trazable de release, observación y rollback sin datos sensibles.
- suite de integración separada contra Supabase desechable: acceso anónimo denegado, allowlist, formularios públicos, transiciones terminales, conversión/eliminación idempotentes y cascadas;
- verificación autenticada manual del dashboard, clientes, contactos, actividades, actualización de datos y respuestas con fixtures sintéticos;
- nombres accesibles añadidos a búsqueda y filtros del dashboard tras el hallazgo visual.

Deuda controlada:

- completar la comparación visual autenticada de Prospección, portales y los cinco bridges complejos;
- cobertura automática de navegador; no se añadió Playwright ni otra dependencia sin un gate específico;
- telemetría de aplicación más allá de los logs de CI y Vercel, pendiente de definir retención, alertas y proveedor.

Criterio cumplido por la Fase 7: el esquema se reconstruye desde las migraciones versionadas y la suite aislada vuelve a aprobar.

## Fase 7 — Reproducibilidad de Supabase (completada)

Objetivo: reconstruir el contrato del backend desde un proyecto vacío sin copiar datos ni identidades productivas.

Trabajo completado:

- baseline estructural `20260720000000_initial_crm_baseline.sql` generada con Supabase CLI y ordenada antes de las cinco incrementales;
- nueve tablas públicas, tabla privada de autorización, RLS, FKs, índices, nueve funciones y grants explícitos reproducidos sin datos;
- membresías específicas de entorno retiradas de la migración estructural de allowlist;
- seis migraciones aplicadas en orden sobre un proyecto vacío;
- firmas de columnas, constraints, índices, funciones, políticas y 47 grants idénticas a producción;
- advisors sin regresiones críticas y suite autenticada/mutante 8/8;
- fixtures y usuarios sintéticos eliminados; entorno temporal pausado.

Deuda operativa controlada:

- la baseline no se registró en el historial productivo durante esta fase; antes de la próxima migración remota debe reconciliarse su estado con `supabase migration repair` mediante un gate separado y revisado;
- permanecen la comparación visual de Prospección/bridges, automatización de navegador y definición de telemetría.

Siguiente gate recomendado: cerrar la validación visual autenticada restante sin cambios de esquema ni datos.

## Fase 8 — Cierre visual autenticado (completada)

Objetivo: completar la comparación visual de Prospección, portales y los cinco bridges complejos con fixtures sintéticos.

Trabajo completado:

- cinco bridges complejos verificados: Inicio, Actividades, layout heredado de Clientes, edición rápida de Contactos y alta de Actividad;
- listado y detalle de Prospección verificados con estados, filtros y métricas sintéticas;
- escritorio 1280×720 y móvil 390×844 sin overlays, errores de consola ni overflow global al cierre;
- ciclo de mutaciones del bridge de Contactos corregido con decoración idempotente;
- nombres accesibles completados en buscadores, filtros y salida móvil de Prospección;
- tabla móvil de listas y formulario móvil de Actividad ajustados sin cambiar lógica de negocio;
- seis pruebas de regresión nuevas; suite elevada de 16 a 22 pruebas;
- entorno temporal limpiado a cero filas e identidades y pausado después de la prueba.

Deuda controlada:

- cobertura automática de navegador aún no está versionada; el gate usó un navegador efímero sin añadir dependencias;
- los cinco bridges permanecen como deuda arquitectónica aunque su comportamiento actual ya está verificado;
- telemetría de aplicación más allá de CI y Vercel continúa pendiente de decisión.

Siguiente gate recomendado: decidir si la Fase 9 retira gradualmente los bridges verificados o prioriza telemetría y observabilidad antes de nuevas funciones de producto.

## Orden de aprobación solicitado

1. Revisar el baseline y aprobar o rechazar `src/` como fuente canónica.
2. Decidir gestor de paquetes/runtime y autorizar un lockfile.
3. Aprobar el contrato de estados/campos de prospectos.
4. Autorizar por separado el aislamiento de rutas y la centralización de Auth.
5. Autorizar por separado cualquier inspección o cambio de Supabase/datos.
6. Autorizar por separado cualquier movimiento o eliminación de duplicados.
7. Iniciar modularización solo después de contar con pruebas mínimas.
