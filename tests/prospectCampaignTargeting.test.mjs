import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260826000000_add_prospect_campaign_targeting.sql",
  import.meta.url,
);

test("school targeting migration is additive and idempotent", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /add column if not exists campaign text/i);
  assert.match(migration, /not exists \([\s\S]*lower\(existing\.company_name\)/i);
  assert.doesNotMatch(migration, /\b(delete|truncate|drop table)\b/i);
  assert.match(migration, /COLEGIO COLOMBO HEBREO/);
  assert.match(migration, /COLEGIO SAN JORGE DE INGLATERRA/);
  assert.match(migration, /ASPAEN GIMNASIO IRAGUA/);
  assert.match(migration, /COLEGIO COLOMBO AMERICANO CAS/);
  assert.match(migration, /COLEGIO NUEVA INGLATERRA/);
  assert.doesNotMatch(migration, /COLEGIO NUEVA YORK/);
  assert.doesNotMatch(migration, /COLEGIO GIMNASIO DEL NORTE/);
});

test("prospecting UI exposes campaign data and filtering", async () => {
  const [queryColumns, detailPage, listPage, databaseTypes] = await Promise.all([
    readFile(new URL("../src/lib/data/queryColumns.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/prospectos/[listId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/prospectos/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/database.types.ts", import.meta.url), "utf8"),
  ]);

  assert.match(queryColumns, /segment,campaign,city/);
  assert.match(detailPage, /Filtrar prospectos por campaña/);
  assert.match(detailPage, /label="Campaña"/);
  assert.match(detailPage, /label="En campaña"/);
  assert.match(listPage, /label="En campaña"/);
  assert.match(databaseTypes, /campaign: string \| null/);
});

