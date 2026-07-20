# Auditoría inicial del repositorio

## 1. Alcance y método

Auditoría local, de solo lectura sobre código y configuración, realizada antes de crear estos documentos. No incluyó conexión a Supabase, inspección de datos, ejecución de flujos que mutan registros ni verificación del despliegue.

Fecha de corte: 2026-07-19.

## 2. Estado de Git verificado

- Repositorio: `C:\Users\pedro\Documents\GitHub\QE`
- Rama inicial: `feature/crm-ui-v1`
- Estado inicial: limpio; sin cambios locales pendientes
- Rama de trabajo documental: `main`
- Actualización: fast-forward desde `5f37263` hasta `ecc2704`
- Seguimiento: `main...origin/main`, sin divergencia observada después del pull
- Commit más reciente: `ecc2704c7c0a9e2da3f7f6c1d546b72bb0d644f3`
- Autor: `pedrogiraldo-1979 <pedro.giraldo@gmail.com>`
- Fecha del commit: `2026-07-18T22:59:56-04:00`
- Asunto: `Add authenticated ZeptoMail internal test (#12)`

## 3. Stack observado

- Next.js `^16.1.6` con App Router
- React / React DOM `^19.2.4`
- TypeScript `^5.7.2`, modo estricto
- Supabase JS `^2.75.0`
- Tailwind/PostCSS configurado como dependencias
- Lucide React para iconografía

Scripts disponibles: `dev`, `build`, `start` y `typecheck`.

## 4. Estructura actual

```text
QE/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── actualizar-datos/
│   │   ├── agregar/
│   │   ├── contactos/nuevo/
│   │   ├── prospectos/
│   │   │   ├── [listId]/
│   │   │   ├── limpieza/
│   │   │   └── nuevo/
│   │   └── prueba-correo/
│   ├── components/
│   └── lib/
├── supabase/
│   └── functions/send-internal-update-test/
├── page.tsx                 # posible duplicado heredado
├── layout.tsx               # posible duplicado heredado
├── globals.css              # posible duplicado heredado
├── supabase.ts              # posible duplicado heredado
├── types.ts                 # posible duplicado heredado
├── package.json
├── tsconfig.json
└── README.md
```

Las carpetas locales `.next/` y `node_modules/` existen, están ignoradas y no forman parte del inventario de código rastreado.

## 5. Rutas observadas

| Ruta | Propósito inferido |
| --- | --- |
| `/` | CRM principal, autenticación, empresas, contactos, actividades, prospectos y revisiones |
| `/agregar` | Alta de empresa/contacto y puente de alta de actividad |
| `/contactos/nuevo` | Alta de contacto |
| `/prospectos` | Listas de prospectos y métricas |
| `/prospectos/nuevo` | Alta de prospecto |
| `/prospectos/[listId]` | Gestión detallada de una lista |
| `/prospectos/limpieza` | Eliminación controlada de prospectos/contactos |
| `/actualizar-datos` | Formulario externo basado en token |
| `/prueba-correo` | Prueba interna autenticada de ZeptoMail |

El propósito es inferido del código y debe validarse con producto.

## 6. Acceso a datos observado

El frontend consulta o muta directamente:

- `companies`
- `contacts`
- `activities`
- `prospect_lists`
- `prospects`
- `prospect_contacts`
- `prospect_activities`

También usa Supabase Auth, Functions y RPC. Se observaron consultas con `select("*")`, consultas con listas explícitas de columnas y límites fijos de 500/600 registros en algunos componentes.

No se verificó:

- esquema real ni restricciones;
- políticas RLS;
- índices o rendimiento;
- contratos y permisos de RPC;
- configuración remota de Auth;
- secretos o despliegue de Edge Functions;
- calidad o volumen de datos.

## 7. Hallazgos

### A-001 — Duplicados estructurales en raíz

Se encontraron cinco pares con hashes y tamaños distintos:

| Raíz | Ubicación bajo `src/` | Tamaño raíz | Tamaño `src/` |
| --- | --- | ---: | ---: |
| `page.tsx` | `src/app/page.tsx` | 24,540 B | 92,137 B |
| `layout.tsx` | `src/app/layout.tsx` | 402 B | 1,723 B |
| `globals.css` | `src/app/globals.css` | 1,789 B | 21,131 B |
| `supabase.ts` | `src/lib/supabase.ts` | 637 B | 766 B |
| `types.ts` | `src/lib/types.ts` | 2,651 B | 3,551 B |

Evidencia a favor de `src/`: el alias `@/*` resuelve a `./src/*`, las rutas están bajo `src/app` y las importaciones encontradas apuntan a `@/lib`. Aun así, no se autoriza retirar los archivos raíz hasta completar la verificación propuesta en `ROADMAP.md`.

Riesgo: edición accidental de una copia inactiva o pérdida de diferencias todavía útiles.

### A-002 — Páginas y estilos de gran tamaño

Archivos destacados por líneas aproximadas:

- `src/app/page.tsx`: 2,209
- `src/app/globals.css`: 1,092
- `src/app/prospectos/[listId]/page.tsx`: 996
- `src/app/agregar/page.tsx`: 517
- `src/app/contactos/nuevo/page.tsx`: 460

Riesgo: alto acoplamiento, revisiones difíciles y regresiones al modificar flujos no relacionados.

### A-003 — Lógica concentrada en componentes cliente

Las rutas principales y varios componentes usan `use client` y combinan autenticación, carga de datos, mutaciones, estado y presentación. Algunos componentes puente manipulan el DOM mediante `document.querySelectorAll`.

Riesgo: comportamiento frágil ante cambios de markup, dificultad para probar y mayor carga en el cliente.

### A-004 — Contratos TypeScript manuales y divergentes

`types.ts` y `src/lib/types.ts` difieren. Los tipos observados son manuales y no hay evidencia local de generación desde Supabase.

Riesgo: desalineación silenciosa entre interfaz, consultas y esquema remoto.

### A-005 — Acceso directo y repetido a Supabase

La creación del cliente está centralizada en `src/lib/supabase.ts`, pero las consultas y mutaciones están repartidas entre páginas y componentes. Se repiten patrones de sesión y autenticación.

Riesgo: manejo inconsistente de errores, permisos y estados de carga; cambios de contrato distribuidos.

### A-006 — Operaciones destructivas desde la interfaz

Las vistas de limpieza y detalle contienen eliminaciones de `prospect_contacts` y `prospects`.

Riesgo: pérdida de datos si confirmaciones, RLS, auditoría o recuperación son insuficientes. No se ejecutaron estas operaciones.

### A-007 — Reproducibilidad no cerrada

No se observó un lockfile rastreado ni scripts de pruebas automatizadas en `package.json`.

Riesgo: resolución variable de dependencias y ausencia de una red de seguridad automatizada.

### A-008 — README parcialmente desactualizado

El README describe principalmente `companies`, `contacts` y `activities`, mientras el código actual incluye prospección, actualización externa y prueba de correo. Además, el texto leído en la consola mostró caracteres mojibake para acentos.

Riesgo: onboarding incompleto y posibles problemas de codificación o visualización que deben comprobarse sin reescribir el archivo todavía.

### A-009 — Configuración y seguridad

Aspectos positivos observados:

- `.env`, `.env.local` y variantes están ignoradas;
- el README advierte no usar `service_role` en el cliente;
- el token de ZeptoMail se mantiene previsto como secreto de Edge Function;
- `src/lib/supabase.ts` evita fallar durante render del servidor cuando faltan variables y usa placeholders solo allí.

Pendiente: validar que las restricciones de usuario, destinatario, RLS y RPC estén efectivamente aplicadas en el backend desplegado.

### A-010 — Dos modelos de estado de prospecto conviven en la aplicación

Prioridad: alta.

Estado posterior a Fase 2: mitigado en frontend. Existe un contrato canónico y una normalización compartida de valores heredados. Falta verificar datos y esquema remoto.

La vista heredada de `src/app/page.tsx` usa estados como `contactado`, `calificado`, `cotizado` y `convertido`. El módulo nuevo de prospectos usa `por_revisar`, `ok_prospecto`, `cliente_actual_excluir`, `sin_contacto`, `contacto_pendiente` y `convertido_cliente`.

También conviven dos nombres de empresa prospecto:

- la vista heredada consulta, ordena y representa `prospect.name`;
- el módulo nuevo crea y representa `prospect.company_name`;
- `src/lib/types.ts` exige ambos campos y declara el bloque antiguo como compatibilidad heredada;
- las respuestas de Supabase se convierten mediante type assertions, sin validar su forma en runtime.

Impacto posible:

- prospectos nuevos invisibles o incompletos en la vista heredada;
- una consulta por la columna `name` puede fallar si el esquema actual solo conserva `company_name`;
- la conversión escribe `convertido`, mientras el módulo nuevo normaliza ese valor a `convertido_cliente`;
- la guarda contra reconversión de la vista heredada compara contra `convertido`, pero su propia función de normalización usa la lista nueva, que no contiene ese valor. Tras recargar, podría no reconocer una conversión previa.

Acción recomendada: acordar un contrato y una máquina de estados canónicos antes de modificar el flujo de conversión.

### A-011 — Mutaciones multietapa sin atomicidad

Prioridad: alta.

Se observaron secuencias donde una segunda operación puede fallar después de confirmar la primera:

- conversión de prospecto: inserta `companies` y después actualiza `prospects`;
- eliminación de prospecto: elimina `prospect_contacts` y después elimina `prospects`;
- alta conjunta: crea `companies` y después intenta crear el contacto principal.

La interfaz informa algunos fallos parciales, pero no existe rollback local. En conversión, un fallo del segundo paso puede dejar una empresa huérfana y permitir reintentos que creen duplicados. En eliminación, puede desaparecer primero la información de contactos aunque el prospecto permanezca.

Acción recomendada: definir operaciones transaccionales/idempotentes del lado de base de datos o una estrategia explícita de compensación. Esto requiere autorización separada para Supabase.

### A-012 — Bridges internos montados globalmente, incluso en rutas públicas

Prioridad: alta para aislamiento y media para rendimiento.

Estado posterior a Fase 2: mitigado en frontend. Los bridges usan carga dinámica y solo se montan en `/`, `/agregar` o `/contactos/nuevo`; el smoke del build confirmó que `/actualizar-datos` no descarga sus módulos.

`src/app/layout.tsx` monta ocho componentes bridge para todas las rutas, incluidas `/actualizar-datos` y `/prueba-correo`. Los manifests del build confirman que esos componentes forman parte de la ruta pública. En particular, `AddContactFromDetail`:

- consulta `companies` inmediatamente al montar;
- instala un `MutationObserver` sobre todo `document.body`;
- mantiene un intervalo cada 800 ms;
- se ejecuta aunque no exista un panel interno de cliente.

Con RLS correcto, la consulta anónima debería ser rechazada; con una política demasiado amplia podría exponer empresas en una ruta pública. Incluso cuando no expone datos, genera trabajo y tráfico innecesarios. Otros bridges también registran observers, listeners o portales globales, aunque varios difieren sus consultas hasta detectar una vista activa.

Acción recomendada: separar layouts público e interno o montar cada extensión dentro de la ruta/componente propietario. Validar RLS antes de confiar en el cliente como control de seguridad.

### A-013 — Fuente canónica confirmada por el build

Prioridad: decisión pendiente, riesgo de ejecución bajo.

Los source maps del build de producción contienen `src/app`, `src/components` y `src/lib`. No contienen los cinco duplicados de raíz. El manifest generó todas las rutas desde `src/app`.

Conclusión técnica: en la configuración local inspeccionada, `src/` es la fuente activa de la aplicación. Los archivos raíz siguen incluidos por el patrón amplio de TypeScript y por ello pueden afectar typecheck, pero no generan rutas ni módulos del bundle observado.

La eliminación continúa bloqueada hasta recibir aprobación explícita y comprobar que el despliegue usa la misma raíz/configuración.

### A-014 — Versiones instaladas sin bloqueo

Prioridad: alta para reproducibilidad.

Estado posterior a Fase 2: resuelto localmente con `packageManager`, `.nvmrc` y `pnpm-lock.yaml`. Falta validar una instalación limpia en CI.

La instalación local usa estructura de pnpm, pero el repositorio no declara `packageManager` ni rastrea lockfile. Las versiones instaladas difieren de los mínimos declarados:

| Paquete | Declarado | Instalado |
| --- | --- | --- |
| Next.js | `^16.1.6` | `16.2.10` |
| React / React DOM | `^19.2.4` | `19.2.7` |
| Supabase JS | `^2.75.0` | `2.110.0` |
| TypeScript | `^5.7.2` | `5.9.3` |
| Tailwind CSS | `^4.1.0` | `4.3.2` |

El build con Next `16.2.10` reescribió automáticamente `next-env.d.ts`; el archivo fue restaurado al hash exacto de Git después de la prueba. Esto es evidencia adicional de que distintas instalaciones pueden producir diffs y comportamiento diferentes.

Acción recomendada: elegir gestor, fijar versión de runtime y generar un lockfile en un cambio aprobado.

### A-015 — Baseline automatizado insuficiente

Prioridad: alta antes de una reorganización amplia.

Estado posterior a Fase 2: parcialmente mitigado con seis pruebas puras y script `pnpm test`. Siguen pendientes lint, integración, end-to-end y CI.

## 7.1 Estabilización Fase 2 ejecutada

Cambios locales realizados, sin tocar Supabase ni datos:

- `src/` registrado como fuente canónica;
- pnpm y Node declarados, con lockfile proveniente de la instalación verificada;
- máquina de estados de prospectos tipada y normalización heredada centralizada;
- vista principal alineada con `company_name` y `convertido_cliente`;
- protección contra reconversión por estado o `converted_company_id`;
- bridges cargados dinámicamente según la ruta;
- consulta de empresas de `AddContactFromDetail` diferida hasta existir un panel aplicable;
- sesión CRM centralizada en un hook compartido;
- seis pruebas puras añadidas.

Verificación:

- typecheck: aprobado;
- pruebas: 6/6 aprobadas;
- build: aprobado, 10/10 páginas generadas;
- ruta pública: scripts iniciales sin módulos de bridges internos.

No existen scripts ni archivos observados para lint, pruebas unitarias, integración o end-to-end, y no se observó configuración de CI. TypeScript detecta errores estructurales, pero no las inconsistencias semánticas descritas arriba ni fallos parciales de mutaciones.

Acción recomendada: añadir primero pruebas puras para normalización/estados y contratos; después cubrir autenticación y mutaciones contra un entorno de datos controlado.

## 8. Priorización sugerida

| Prioridad | Tema | Acción documental/técnica siguiente |
| --- | --- | --- |
| Alta | Fuente canónica y duplicados | Baseline de build/rutas; presentar comparación y pedir aprobación |
| Alta | Seguridad y operaciones destructivas | Revisar contratos y entorno, sin mutar datos |
| Alta | Reproducibilidad | Elegir gestor, lockfile y checks mínimos |
| Media | Páginas grandes y bridges DOM | Diseñar extracción incremental por dominio |
| Media | Tipos y acceso a datos | Verificar esquema y centralizar contratos con autorización |
| Media | README y codificación | Actualizar después de aprobar alcance y estructura |
| Baja | Consolidación de estilos | Abordar después de fijar baseline visual |

## 9. Plan antes de tocar duplicados

1. Confirmar que `main` continúa limpia salvo por estos documentos.
2. Ejecutar typecheck y build en una fase autorizada.
3. Verificar rutas locales y artefactos de despliegue.
4. Comparar cada par por funcionalidad e historial, no solo por tamaño.
5. Presentar qué se conserva, qué se integra y qué se propone retirar.
6. Recibir aprobación explícita.
7. Aplicar cambios en commits separados y reversibles.

## 10. Declaración de no intervención documental

Durante la fase documental inicial no se modificó código funcional, configuración de Supabase, Edge Functions, secretos ni datos. La Fase 2 fue autorizada después y sus cambios se registran en la sección 13. No se borró ni movió ningún archivo duplicado.

## 11. Baseline técnico ejecutado

Fecha: 2026-07-19.

Verificaciones completadas:

- TypeScript: aprobado con `tsc --noEmit`, sin errores.
- Build de producción: aprobado con Next.js `16.2.10` y Turbopack.
- Generación estática: 10 de 10 páginas generadas.
- Rutas estáticas confirmadas: `/`, `/actualizar-datos`, `/agregar`, `/contactos/nuevo`, `/prospectos`, `/prospectos/limpieza`, `/prospectos/nuevo` y `/prueba-correo`.
- Ruta dinámica confirmada: `/prospectos/[listId]`.
- Smoke HTTP local: todas las rutas inventariadas respondieron `200`; una ruta inexistente respondió `404`.
- Source maps/manifests: confirman que el bundle usa `src/`.
- Codificación: documentos y README son UTF-8 válidos; el mojibake observado fue una limitación de visualización de PowerShell.

Limitaciones:

- no se hidrató ni navegó la UI en un navegador porque no existe `.env.local` y usar los valores públicos de `.env.example` habría conectado con el backend remoto;
- no se inició sesión ni se inspeccionaron datos;
- no se invocaron RPC, Auth, Edge Functions ni ZeptoMail;
- no se validaron RLS, esquema, transacciones ni despliegue remoto;
- el smoke HTTP confirma entrega de HTML, no comportamiento funcional cliente.

## 12. Conclusión y orden recomendado

El repositorio compila y sus rutas base se generan, pero todavía no es seguro iniciar una reorganización extensa. El orden recomendado es:

1. aprobar `src/` como fuente canónica y decidir el tratamiento separado de duplicados;
2. cerrar reproducibilidad con gestor, runtime y lockfile;
3. unificar contrato/campos/estados de prospectos y proteger la conversión contra duplicados;
4. aislar rutas públicas de bridges internos y verificar RLS;
5. volver atómicas o idempotentes las mutaciones críticas;
6. crear una red mínima de pruebas;
7. modularizar páginas, acceso a datos y estilos;
8. verificar visual y funcionalmente con un entorno de datos controlado.

## 13. Auditoría y estabilización remota de Supabase

Fecha: 2026-07-19. Proyecto verificado: `QE2026` (`izbfawwmbilmsrdjaanw`), PostgreSQL 17, estado saludable.

Inventario observado antes y después de las migraciones, sin cambios en los conteos:

- 83 empresas y 83 contactos;
- 2 actividades CRM;
- 220 prospectos, todos con estado legado `por_validar` y ninguno enlazado todavía a `converted_company_id`;
- 0 contactos de prospecto y 80 actividades de prospecto;
- 3 listas, 83 enlaces de actualización y 8 respuestas.

Hallazgos y mitigaciones:

- RLS está habilitado en las nueve tablas expuestas, pero cada política permite todas las filas a cualquier usuario `authenticated`. No se modificó porque falta un modelo de ownership/roles.
- `approve_cu_response`, `reject_cu_response` y `get_cu_pending_reviews` eran ejecutables por `anon` como `SECURITY DEFINER`. Ahora son `SECURITY INVOKER`, sin privilegio `PUBLIC`/`anon` y solo para `authenticated`.
- `get_cu_form` y `submit_cu_form` permanecen públicas por diseño de token, con `PUBLIC` revocado, `search_path` vacío y concesiones explícitas. El envío ahora exige token activo/no vencido, objeto JSON y máximo 32 KB.
- `convert_prospect_to_company` bloquea la fila, devuelve la empresa ya enlazada en reintentos e inserta/actualiza dentro de una sola transacción.
- `delete_prospect` elimina una sola fila y deja que las claves foráneas `ON DELETE CASCADE` retiren contactos/actividades en la misma transacción.
- Se añadieron índices para las nueve claves foráneas reportadas; el advisor ya no reporta claves foráneas sin índice.
- La protección de contraseñas filtradas sigue deshabilitada y requiere configuración de Auth.

Migraciones remotas y locales:

- `20260720001733_phase_2_stabilization.sql`;
- `20260720002112_public_form_guardrails.sql`.

Verificación posterior:

- permisos efectivos de las siete RPC auditadas comprobados;
- conteos productivos invariantes; no se invocaron RPC que mutan datos;
- typecheck aprobado;
- pruebas puras 6/6;
- build de producción aprobado, 10/10 páginas.

El riesgo de acceso para cualquier usuario autenticado quedó resuelto mediante allowlist privada. Riesgos abiertos: los roles `admin` y `member` todavía comparten CRUD; la protección de contraseñas filtradas sigue deshabilitada; y queda pendiente decidir una eventual migración de `por_validar` a `por_revisar`, actualmente normalizado solo en frontend.

## 14. Modelo de autorización aplicado

- Miembros activos: Pedro (`admin`) y Ventas (`member`).
- Fuente de autorización: `private.crm_authorized_users`, con referencia a `auth.users`, estado activo y borrado en cascada si se elimina la cuenta Auth.
- Políticas: las nueve tablas CRM requieren `private.is_crm_authorized()` en `USING` y `WITH CHECK`.
- Privilegios: `authenticated` conserva únicamente `SELECT`, `INSERT`, `UPDATE` y `DELETE`; `anon` no tiene acceso directo; `TRUNCATE`, `TRIGGER` y `REFERENCES` fueron retirados de los roles cliente.
- Superficie pública: `get_cu_form` y `submit_cu_form` siguen siendo las únicas operaciones anónimas deliberadas y no conceden acceso directo a tablas.
- Interfaz: `useCrmSession` consulta `is_crm_authorized`; una cuenta ajena a la allowlist recibe un mensaje explícito y se cierra su sesión.
- Advisor: desaparecieron las nueve alertas de políticas RLS siempre verdaderas. Permanecen las advertencias esperadas por las dos funciones públicas con `SECURITY DEFINER`, la protección de contraseñas filtradas y avisos informativos de índices sin uso reciente.

Pruebas de solo lectura:

- Pedro: autorizado; 83 empresas, 220 prospectos y 8 respuestas visibles.
- Ventas: autorizado; 83 empresas, 220 prospectos y 8 respuestas visibles.
- UUID externo: no autorizado; cero filas visibles.
- `anon`: consulta directa a `companies` rechazada con código `42501`.
- token público inexistente: respuesta nula, sin exposición de datos.

## 15. Auditoría de duplicados — Fase 3

La comparación completa está en `docs/PHASE-3-DUPLICATES.md`.

Conclusiones:

- los archivos raíz `page.tsx`, `layout.tsx`, `globals.css`, `supabase.ts` y `types.ts` no generan rutas ni aparecen en source maps;
- antes del retiro, los cuatro archivos TypeScript raíz eran incluidos innecesariamente por el patrón amplio de `tsconfig.json`, aunque no formaban parte del runtime;
- `page.tsx` raíz quedó congelado en `d390f5e`; sus 14 funciones tienen equivalente nominal en `src/app/page.tsx`, que contiene 65 funciones y los flujos posteriores;
- `layout.tsx` raíz no contiene bridges ni hojas de estilo posteriores;
- `.card` es el único selector simple exclusivo de `globals.css` raíz y solo es usado por `page.tsx` raíz;
- `supabase.ts` raíz no tiene consumidores y carece del fallback seguro de render de servidor;
- `types.ts` raíz conserva estados heredados y no contiene listas/contactos de prospectos; no tiene consumidores;
- no existe contenido que deba migrarse desde raíz hacia `src/`.

Evidencia de build y despliegue:

- el manifest local genera diez páginas desde `src/app`;
- referencias de source maps: cero para los cinco archivos raíz y referencias positivas para los cuatro equivalentes TypeScript de `src/`;
- Vercel identifica el proyecto `qe` como Next.js, Node 24, conectado a `main`;
- la producción previa `READY` corresponde a `ecc2704` y la URL pública entrega el texto de sesión de la variante canónica;
- el deployment de `957ba5e` falló antes del build, durante instalación de pnpm, con `ERR_PNPM_IGNORED_BUILDS` para `sharp@0.34.5`;
- la producción continúa sirviendo el deployment anterior y el fallo no guarda relación con los duplicados;
- se añadió `pnpm-workspace.yaml` con `allowBuilds: { sharp: true }`, el permiso mínimo compatible con pnpm 11;
- con esa configuración, la instalación ejecutó el instalador de `sharp` y pasaron typecheck, 6/6 pruebas y el build local de 10 rutas;
- el checkpoint `f7dff54` produjo el deployment de producción `dpl_AtBieAF6GGuzDNJkPA11wzK1zvga` en estado `READY`;
- `https://qe-chi.vercel.app` respondió `200`, mostró la variante canónica y no se detectaron errores de runtime en la hora posterior al deployment.

Ejecución autorizada:

- Pedro autorizó explícitamente eliminar los cinco archivos inventariados;
- se retiraron juntos `page.tsx`, `layout.tsx`, `globals.css`, `supabase.ts` y `types.ts` de la raíz;
- no se modificó `src/`, Supabase ni datos;
- `tsc --listFilesOnly` confirmó que las cuatro copias TS/TSX ya no forman parte del typecheck;
- pasaron typecheck, 6/6 pruebas y el build de las mismas 10 rutas;
- el manifest mantuvo el baseline y los source maps conservaron referencias a `src/` sin referencias a las copias eliminadas.

Decisión operativa: Fase 3 completada localmente; el commit estructural debe validarse en producción antes de cerrar la entrega remota.

## 16. Modularización de interfaz — Fase 4

Fecha: 2026-07-19.

Baseline inicial:

- `src/app/page.tsx`: 2.375 líneas;
- lógica de vista, calidad, filtros, formatters, carga, mutaciones y tablas coexistían en la misma ruta;
- `CrmClientBridges` montaba ocho extensiones dinámicas en `/`.

Corte estructural ejecutado:

- `src/features/crm/dashboardModel.ts` concentra tipos de vista, etiquetas, formatters, filtros, calidad y selección de próxima actividad;
- `src/hooks/useCrmDashboardData.ts` concentra las cinco lecturas paralelas del dashboard y la lectura/aprobación/rechazo de respuestas, conservando los nombres de tablas y RPC;
- `src/components/crm/` contiene vistas nombradas separadas para inicio, métricas, navegación, empresas, contactos, actividades, prospectos, calidad y respuestas;
- `src/app/page.tsx` quedó en 1.500 líneas, una reducción de 875 líneas (36,8 %);
- `GlobalTopbarAddAction`, `AddContactFromDetail` y `ProspectingRouteBridge` fueron retirados; botón Agregar, enlace contextual de contacto y navegación usan React/Next directamente;
- la selección de próxima actividad dejó de ordenar en sitio el arreglo recibido y ahora preserva el orden fuente;
- se añadieron cinco pruebas puras para estados de cliente, próxima actividad, vencimiento, calidad de contacto, enlaces y respuestas.

Fuera de alcance y sin cambios:

- esquema, RLS, Auth, Edge Functions, secretos y datos de Supabase;
- nombres de tablas, columnas y RPC usados por el frontend;
- cinco bridges complejos que dependen de portales, workbenches o decoración DOM;
- archivos CSS y parches visuales, pendientes de una comparación autenticada.

Verificación local completada: typecheck aprobado, 11/11 pruebas aprobadas, build de las mismas 10 rutas y smoke HTTP `200` en 7 rutas representativas. La verificación remota se ejecutará al publicar el commit de Fase 4.
