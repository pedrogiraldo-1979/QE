# Fase 3 — Plan de resolución de duplicados

## Estado

- Auditoría: completada el 2026-07-19.
- Fuente canónica: `src/`, aprobada previamente.
- Eliminación: ejecutada como una unidad el 2026-07-19.
- Gate: cerrado mediante deployment de producción `READY` y autorización explícita de Pedro.

## Inventario comparado

| Copia raíz | Fuente canónica | Raíz | Canónica | Historial y conclusión |
| --- | --- | ---: | ---: | --- |
| `page.tsx` | `src/app/page.tsx` | 589 líneas | 2.375 líneas | raíz congelada desde `d390f5e`; es un subconjunto funcional obsoleto |
| `layout.tsx` | `src/app/layout.tsx` | 15 líneas | 28 líneas | raíz congelada desde `d390f5e`; no monta bridges ni estilos posteriores |
| `globals.css` | `src/app/globals.css` | 104 líneas | 1.286 líneas | raíz congelada desde `d390f5e`; su único selector exclusivo es `.card` |
| `supabase.ts` | `src/lib/supabase.ts` | 19 líneas | 23 líneas | sin consumidores; la canónica añade compatibilidad de render de servidor |
| `types.ts` | `src/lib/types.ts` | 120 líneas | 159 líneas | sin consumidores; conserva contrato y estados heredados |

Todos los hashes SHA-256 difieren. El diff agregado confirma que las variantes canónicas contienen la evolución posterior, no una bifurcación paralela activa.

## Evidencia de enrutamiento e imports

Next.js reconoce rutas dentro de `app` o `src/app`; un `page.tsx` suelto en la raíz no es una ruta. La documentación oficial también contempla `src/` como carpeta de aplicación: <https://nextjs.org/docs/app/getting-started/project-structure>.

En este repositorio:

- no existe una carpeta `app/` raíz;
- `next.config.ts` no redefine rutas ni directorio fuente;
- `@/*` resuelve exclusivamente a `./src/*`;
- incluso `page.tsx` raíz importa `@/lib/supabase` y `@/lib/types`, no las copias raíz;
- ningún archivo importa `supabase.ts` o `types.ts` raíz;
- cada layout importa únicamente su propia hoja `./globals.css`.

## Comparación funcional

### Página

La página raíz cubre solo autenticación, empresas, contactos, actividades, cambio de estado y alta de actividad. Sus 14 funciones declaradas tienen una función del mismo nombre en la página canónica.

La página canónica añade o conserva:

- inicio comercial y navegación ampliada;
- prospectos y actividades de prospectos;
- conversión transaccional;
- respuestas de actualización de clientes;
- completado de actividades;
- calidad de datos, filtros y métricas;
- sesión centralizada y autorización por allowlist.

No existe una acción de dominio exclusiva en la página raíz que requiera traslado.

### Layout y estilos

El layout canónico conserva metadata, idioma y children del layout raíz, y además carga los estilos vigentes y `CrmClientBridges`.

La comparación de selectores simples encontró ocho en la hoja raíz y 95 en la canónica. `.card` es el único selector exclusivo de raíz y sus cuatro usos están dentro del `page.tsx` raíz. Al retirar ambos archivos no queda consumidor pendiente.

### Cliente de Supabase y tipos

`src/lib/supabase.ts` contiene todo el comportamiento de la copia raíz y añade un cliente placeholder únicamente durante render de servidor cuando faltan variables. `src/lib/types.ts` contiene el contrato vigente verificado contra el backend y amplía el modelo con listas, contactos, prioridad y estados canónicos.

No debe copiarse ninguna diferencia desde raíz.

## TypeScript y bundle

El `include` amplio de `tsconfig.json` incorpora actualmente los cuatro archivos TS/TSX raíz además de sus equivalentes canónicos. Por eso su retiro reduce ambigüedad y superficie de typecheck.

El build inspeccionado muestra:

- cero referencias en source maps a los cinco archivos raíz;
- referencias positivas a `src/app/page.tsx`, `src/app/layout.tsx`, `src/lib/supabase.ts` y `src/lib/types.ts`;
- todas las rutas inventariadas generadas desde `src/app`.

Resultado esperado del retiro: ninguna ruta ni módulo de runtime cambia; cuatro unidades obsoletas dejan de ser compiladas por TypeScript.

## Evidencia de Vercel

El proyecto Vercel `qe` está conectado al repositorio, usa framework Next.js y Node 24. La producción `READY` anterior corresponde a `ecc2704` y sirve la variante canónica de `src/`.

El checkpoint `957ba5e` produjo el deployment `dpl_AZGtMewygSvc1jcURhYqUZgM7zmC`, que falló antes de ejecutar `next build`:

```text
ERR_PNPM_IGNORED_BUILDS: Ignored build scripts: sharp@0.34.5
Command "pnpm install" exited with 1
```

El cambio de npm a pnpm invalidó la caché y Vercel exigió una aprobación explícita del script de build. Este problema es independiente de los duplicados. El cambio separado `pnpm-workspace.yaml` autoriza exclusivamente el build de `sharp` mediante `allowBuilds`. La instalación, el typecheck, las 6 pruebas y el build local de 10 rutas quedaron correctos.

El checkpoint `f7dff54` produjo el deployment de producción `dpl_AtBieAF6GGuzDNJkPA11wzK1zvga` en estado `READY`. La URL pública respondió `200` con la variante canónica y la revisión de runtime de la hora posterior no encontró errores.

## Ejecución del retiro

Después de obtener el deployment `READY` y la aprobación explícita:

1. se confirmó `main` limpia y sincronizada con `origin/main` en `c0e6422`;
2. se eliminaron juntos únicamente:
   - `page.tsx`;
   - `layout.tsx`;
   - `globals.css`;
   - `supabase.ts`;
   - `types.ts`;
3. no se movió contenido ni se editaron archivos canónicos;
4. TypeScript confirmó que las cuatro copias TS/TSX dejaron de aparecer en `--listFilesOnly`;
5. pasaron typecheck y 6/6 pruebas puras;
6. el build conservó las mismas 10 rutas del baseline;
7. los source maps conservaron referencias positivas a `src/` y cero referencias a las copias raíz;
8. el diff estructural contiene exactamente las cinco eliminaciones, además de la actualización documental del cierre;
9. la publicación del commit debe alcanzar `READY` antes de dar por cerrada la entrega remota.

## Rollback

La recuperación preferida es revertir únicamente el commit de limpieza. Como respaldo, el commit `957ba5e` conserva las cinco copias con sus hashes originales. No se requiere rollback de Supabase, datos, variables ni servicios externos porque la limpieza es exclusivamente local al repositorio.

## Gate resuelto

- árbol limpio y sincronizado antes del retiro: confirmado;
- deployment previo `READY`: confirmado;
- autorización explícita de Pedro: recibida;
- eliminación limitada a los cinco archivos inventariados: confirmada.
