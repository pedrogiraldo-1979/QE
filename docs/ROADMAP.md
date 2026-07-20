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

## Fase 3 — Resolución controlada de duplicados, pendiente de aprobación

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

## Fase 4 — Modularización de interfaz, pendiente de aprobación

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

## Fase 5 — Contratos y capa de datos, requiere autorización de Supabase

Objetivo: alinear tipos y acceso a datos con el backend real.

Trabajo propuesto, no autorizado todavía:

- obtener o generar tipos desde el esquema verificado;
- centralizar repositorios/servicios y manejo de errores;
- revisar consultas amplias `select("*")` y límites fijos;
- documentar RPC, RLS, Auth y Edge Functions;
- revisar idempotencia y seguridad de mutaciones destructivas.

Gate: autorización explícita antes de inspeccionar o cambiar configuración remota, políticas, funciones o datos.

## Fase 6 — Calidad y operación

Objetivo: hacer el sistema seguro de evolucionar y operar.

Trabajo propuesto:

- pruebas unitarias para reglas puras;
- pruebas de integración contra un entorno controlado;
- pruebas end-to-end de flujos críticos;
- accesibilidad y revisión responsive;
- observabilidad sin datos sensibles;
- checklist de release y rollback.

## Orden de aprobación solicitado

1. Revisar el baseline y aprobar o rechazar `src/` como fuente canónica.
2. Decidir gestor de paquetes/runtime y autorizar un lockfile.
3. Aprobar el contrato de estados/campos de prospectos.
4. Autorizar por separado el aislamiento de rutas y la centralización de Auth.
5. Autorizar por separado cualquier inspección o cambio de Supabase/datos.
6. Autorizar por separado cualquier movimiento o eliminación de duplicados.
7. Iniciar modularización solo después de contar con pruebas mínimas.
