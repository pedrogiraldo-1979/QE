# Matriz de trazabilidad de migraciones — QE2026

- Corte: 2026-09-28; rama `codex/supabase-reconciliation-plan`, commit de partida `ce25902`.
- Proyecto leído: QE2026 (`izbfawwmbilmsrdjaanw`), confirmado `ACTIVE_HEALTHY` antes de la consulta.
- Alcance: metadatos y huellas del historial `supabase_migrations.schema_migrations`; diez archivos bajo `supabase/migrations/`. No se leyeron filas comerciales ni se publicó el SQL remoto, identidades, correos o payloads.
- Estado: matriz documental de D-030. No autoriza `db push`, `migration repair`, `apply_migration` ni ejecución de SQL sobre QE2026.

## Método y límites

`MD5-LF` se calcula sobre el archivo local completo o sobre `array_to_string(statements, E'\n')` remoto, después de convertir CRLF/CR a LF. `MD5-N` toma ese texto, elimina líneas completas que empiezan con espacios opcionales y `--`, comprime espacios consecutivos a uno y recorta extremos. La misma receta se aplicó a ambos lados; los hashes se calcularon sin devolver el SQL registrado al informe. Como comprobación adicional de la revisión textual anterior, `MD5-T` recorta **sólo** espacios y saltos al principio/final del texto LF, sin tocar comentarios ni espacios internos.

`MD5-N` es una normalización **heurística**, no un parser SQL: puede ocultar diferencias dentro de literales y no prueba equivalencia semántica, estado final, permisos ni idempotencia. `MD5-LF` refleja además el texto almacenado, incluidos espacios, comentarios y saltos de línea; un hash distinto no demuestra por sí solo un cambio funcional. Ningún hash sirve como respaldo de la base o como autorización de replay.

## Diez archivos locales y su correspondencia propuesta

Cada versión local identifica un único archivo `supabase/migrations/<versión>_*.sql`. Los pares con versión remota distinta se identificaron previamente por nombre y revisión de SQL; aquí se contrastan sus huellas. En cada celda separada por `/`, el primer hash es local y el segundo remoto.

| Versión local | Versión remota | MD5-LF local / remoto | MD5-N local / remoto | Lectura |
| --- | --- | --- | --- | --- |
| `20260720000000` | `20260720000000` | `9f3c791f50cbcbf933e2ac3554052c90` / `07e1e436687be0b9cb52778db3d6b402` | `09d5037f0319b4537833c04190152793` / `07e1e436687be0b9cb52778db3d6b402` | Diferente |
| `20260720001733` | `20260720001733` | `1fb01a9638c6dfd7ba797aa686b28a0c` / `fb7d8d0ced9fe5e1822ce1d435186721` | `17f68de55f4386a8255807d157a0578a` / `17f68de55f4386a8255807d157a0578a` | Norm. igual; versión igual |
| `20260720002112` | `20260720002112` | `902910617aaca74daf9c7b97ee8b9877` / `79a5107d5cb07065cd0de0b1b766a937` | `94586b3c7fb2187ed6cf6f41a6b76b6f` / `94586b3c7fb2187ed6cf6f41a6b76b6f` | Norm. igual; versión igual |
| `20260720012043` | `20260720012043` | `488349e1c2b7008727cf0561a719ab68` / `66b4ce481ce3e9e454bfb20bbf717e37` | `fee542e2c86a7926cc8e903a377be92f` / `59bbaa0cc290d22c95bfe8ecaaccc3b9` | Diferente |
| `20260720012701` | `20260720012701` | `ce6ed1d3e313aa298989f1b1e93231f4` / `ac7fbce172bb218204a829f2b4aa1fde` | `7ded8eacf6b612c6ca86cbb30a175340` / `7ded8eacf6b612c6ca86cbb30a175340` | Norm. igual; versión igual |
| `20260720031715` | `20260720031715` | `58d6654b9d5da29edcd17ac0b7472685` / `2b41f5c3aba2ff1f5da93dc501d44a54` | `8fdcf3f25865b3439822a5fb39e27434` / `8fdcf3f25865b3439822a5fb39e27434` | Norm. igual; versión igual |
| `20260721023246` | `20260721030022` | `c5dfd7346e30d82eab0d833b20bd14f2` / `c5dfd7346e30d82eab0d833b20bd14f2` | `8fbc63d9884a2731affe2ec59effc425` / `8fbc63d9884a2731affe2ec59effc425` | Norm. igual; versión distinta |
| `20260721170728` | `20260721173624` | `9a8145cd1d50f4f9487a9b115ea8a36f` / `9a8145cd1d50f4f9487a9b115ea8a36f` | `87febafb5f10cdd0c7314e29238b84fb` / `87febafb5f10cdd0c7314e29238b84fb` | Norm. igual; versión distinta |
| `20260826000000` | `20260827015743` | `fe8b6cd7b5b54cf1a81812285404fa59` / `8b738e81a3d1de07eef3d8f218209715` | `8438e205a3c66b9a60e04b9a3c0550e3` / `8438e205a3c66b9a60e04b9a3c0550e3` | Norm. igual; versión distinta |
| `20260917000000` | `20260925200537` | `3d88590ef54d734f2202440eaec5925e` / `3f8dc9a3c7bbb93ab873a8e63bd8c7f0` | `e46d8b912f6ed8803b06ec06055efa2c` / `e46d8b912f6ed8803b06ec06055efa2c` | Norm. igual; versión distinta |

Resumen: seis versiones numéricas coinciden y cuatro no; ocho pares tienen `MD5-N` igual. Las excepciones son `20260720000000` (marcador remoto frente a baseline estructural local) y `20260720012043` (siembra remota de membresías retirada del archivo local). Sólo dos pares tienen además `MD5-LF` idéntico sin recortar extremos: piloto y aprobación/maestros. La comprobación adicional `MD5-T` reconcilia la revisión textual previa: **siete de los ocho pares normalizados coinciden exactamente tras recortar extremos**. El octavo, `20260720031715`, conserva un comentario local adicional, ya documentado. Cada par remoto se guarda como una sola entrada de `statements`; las diferencias de `MD5-LF` en los otros seis pares se deben a espacios/saltos exteriores, no a concatenación. Esto tampoco demuestra equivalencia semántica ni autoriza replay.

## Diecinueve versiones sólo remotas

No existe archivo local con estas versiones ni se propone crearlo retroactivamente. El efecto de cada una, incluidos los tres backfills de nivel superior, está clasificado en el [plan de conciliación](./superpowers/plans/2026-09-25-migration-history-reconciliation.md).

| Versión remota | Nombre registrado | MD5-LF remoto | MD5-N remoto |
| --- | --- | --- | --- |
| `20260701140601` | `create_cu_links` | `c56f0814ea3feb0573754f066914c4ee` | `8429c0a2a8c3c2c208394afe4cf70109` |
| `20260701140700` | `create_cu_responses` | `ba412a744bf7652eb4c74345402c2b66` | `314887fa28efaf4564163a760070d396` |
| `20260701140823` | `cu_authenticated_policies` | `63919738ad5ceb1072f7b13f608e934e` | `b477abb49859c898ad797fdb8a1b79be` |
| `20260701141010` | `cu_get_form_function_short` | `a2843206eec85792013782677f560725` | `60a1f302006cf054be6505f169c954e7` |
| `20260701141127` | `cu_get_form_grants` | `0c11c59a4681798538ae4d6a5d46fc35` | `0c11c59a4681798538ae4d6a5d46fc35` |
| `20260701141258` | `cu_add_payload_json` | `c0f2af1f0938bee30763050fffdea678` | `2b54bbd78a8dcd89832af353b295d14e` |
| `20260701141447` | `cu_submit_min` | `2357c39bf77ea6e0042adfc6f3d7f52e` | `67c57963150bc73294241db95c9b49b8` |
| `20260707001356` | `cu_review_list_function` | `54b1865e911f3a0fcb729f8a074048f3` | `2a2d2a4e60f74ae780ab5b1a23b5a19c` |
| `20260707001459` | `cu_review_action_functions` | `9d7a72b543c010bda2db24dd7b8ae343` | `4b913b6dc77b8fb251bac20a58bae710` |
| `20260707001603` | `cu_review_function_grants` | `bf590561873035d9048ef0e4a074ec46` | `b474a0c49c4b1e6e694f481309605103` |
| `20260707003026` | `create_prospecting_base_tables` | `b3b84a522c4b7a05d4a6a2b782216c72` | `b65dc0ba226de97106c96418f80c4277` |
| `20260707003159` | `prospecting_enable_rls` | `2ef0f0e6e18700310f78cc97ee4e2be5` | `acb51fb76f3e530610c6879ffcec65af` |
| `20260707013441` | `expand_contacts_for_multiple_commercial_contacts` | `df34b7ea069e86cf35e50ab1305f4a29` | `10777b63f7274d6db26c3d588707c896` |
| `20260722031506` | `fix_customer_update_form_contact_prefill` | `98d4fa918bdd1ad910ee80b30caa1da4` | `8f65d6aa4a70fb1dc56b0a5e01847f1c` |
| `20260722034019` | `add_campaign_batch_key` | `e1471161d604c3726d27032e955b0511` | `fac628ec166027a052ef1eda9383a8c9` |
| `20260722034030` | `expand_campaign_batch_constraints` | `60d520260255ee3c6e455ddcfd7a9a2e` | `42be3f14d01b905a2a6d8ce0158056ea` |
| `20260722034045` | `add_claim_campaign_batch_function` | `b9d0a053d144ceec64f058311350050d` | `4f961f5b2ac57f5f1fb569ef3cd489e0` |
| `20260722142520` | `fix_customer_update_review_queue` | `8c8c22421e39c8924a6dcb5992fcab20` | `9007222ca92fcb2c79dc718a65b99765` |
| `20260804203513` | `fix_campaign_batch_claiming` | `67c90daf582942f0b0d156213c10157f` | `ef50ad41fe1db8ab3f52da6547c58444` |

## Implicación para el siguiente release

Las cuatro versiones locales sin **esa misma versión** en QE2026 son `20260721023246`, `20260721170728`, `20260826000000` y `20260917000000`; cada una tiene un par remoto bajo otro timestamp. Por comparación de versiones, el árbol actual no permite presumir que un `db push` o su dry-run seleccionaría únicamente una migración nueva. No se ejecutó ese dry-run: la CLI no está instalada en este entorno y aún no existe un SQL nuevo aprobado. El procedimiento y las condiciones de parada están en [SUPABASE-RELEASE-PROCEDURE.md](./SUPABASE-RELEASE-PROCEDURE.md).

Para cualquier release futuro, repetir la lectura antes de actuar. Si cambian el número, las versiones o las huellas remotas, detenerse y revisar la divergencia antes de preparar una ejecución.
