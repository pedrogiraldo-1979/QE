# Fase 3 — Plan de resolución de duplicados

## Estado

- Auditoría: completada el 2026-07-19.
- Fuente canónica: `src/`, aprobada previamente.
- Eliminación: no ejecutada.
- Gate actual: recuperar primero un deployment de producción `READY` y solicitar aprobación explícita para retirar los cinco archivos.

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

El cambio de npm a pnpm invalidó la caché y Vercel exigió una aprobación explícita del script de build. Este problema es independiente de los duplicados. Se preparó el cambio separado `pnpm-workspace.yaml`, que autoriza exclusivamente el build de `sharp` mediante `allowBuilds`. La instalación, el typecheck, las 6 pruebas y el build local de 10 rutas quedaron correctos; falta la confirmación remota.

## Plan exacto de retiro

Después de obtener un deployment `READY` del checkpoint:

1. crear una rama dedicada desde `main` limpia;
2. eliminar juntos únicamente:
   - `page.tsx`;
   - `layout.tsx`;
   - `globals.css`;
   - `supabase.ts`;
   - `types.ts`;
3. no mover contenido ni editar archivos canónicos en ese commit;
4. ejecutar typecheck y confirmar que los cuatro archivos dejan de aparecer en `--listFilesOnly`;
5. ejecutar las pruebas puras;
6. ejecutar build y comparar manifest/rutas con el baseline;
7. verificar que los source maps sigan apuntando a `src/`;
8. levantar un preview de Vercel y ejecutar smoke sobre las rutas públicas e internas sin mutar datos;
9. revisar el diff, que debe contener exactamente cinco eliminaciones;
10. crear un commit estructural separado y solicitar aprobación antes de integrarlo.

## Rollback

La recuperación preferida es revertir únicamente el commit de limpieza. Como respaldo, el commit `957ba5e` conserva las cinco copias con sus hashes originales. No se requiere rollback de Supabase, datos, variables ni servicios externos porque la limpieza es exclusivamente local al repositorio.

## Gate solicitado

No aprobar todavía el borrado hasta que:

- el problema `ERR_PNPM_IGNORED_BUILDS` esté resuelto;
- el checkpoint tenga deployment `READY`;
- se confirme nuevamente que el árbol está limpio;
- Pedro autorice explícitamente las cinco eliminaciones listadas.
