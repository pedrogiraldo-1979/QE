import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

async function read(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(entryPath) : [entryPath];
    }),
  );
  return files.flat().filter((file) => /\.(ts|tsx)$/.test(file));
}

test("el contrato generado conserva las tablas y RPC verificadas", async () => {
  const databaseTypes = await read("src/lib/database.types.ts");
  const tables = [
    "activities",
    "companies",
    "contacts",
    "cu_links",
    "cu_responses",
    "prospect_activities",
    "prospect_contacts",
    "prospect_lists",
    "prospects",
  ];
  const functions = [
    "approve_cu_response",
    "convert_prospect_to_company",
    "delete_prospect",
    "get_cu_form",
    "get_cu_pending_reviews",
    "is_crm_authorized",
    "reject_cu_response",
    "submit_cu_form",
  ];

  for (const table of tables) {
    assert.match(databaseTypes, new RegExp(`\\b${table}: \\{`), `Falta la tabla ${table}`);
  }
  for (const functionName of functions) {
    assert.match(databaseTypes, new RegExp(`\\b${functionName}: \\{`), `Falta la RPC ${functionName}`);
  }
});

test("las consultas del frontend no vuelven a usar select('*')", async () => {
  const files = await sourceFiles(path.join(repositoryRoot, "src"));
  const violations = [];

  for (const file of files) {
    const contents = await readFile(file, "utf8");
    if (/\.select\(\s*["']\*["']\s*\)/.test(contents)) {
      violations.push(path.relative(repositoryRoot, file));
    }
  }

  assert.deepEqual(violations, []);
});

test("la revisión de respuestas usa el argumento RPC generado", async () => {
  const repository = await read("src/lib/data/crmDashboardRepository.ts");
  assert.match(repository, /client\.rpc\(rpcName, \{ p_response_id: responseId \}\)/);
  assert.doesNotMatch(repository, /client\.rpc\(rpcName, \{ response_id:/);
});

test("la migración mantiene terminal el rechazo y restringe su ejecución", async () => {
  const migration = await read("supabase/migrations/20260720031715_guard_customer_response_transitions.sql");
  assert.match(migration, /status = 'pendiente'/);
  assert.match(migration, /revoke execute[^;]+from public, anon, authenticated;/i);
  assert.match(migration, /grant execute[^;]+to authenticated;/i);
});

test("la baseline reconstruye el contrato sin sembrar identidades ni datos", async () => {
  const migrationDirectory = path.join(repositoryRoot, "supabase", "migrations");
  const migrations = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort();
  const baselineName = "20260720000000_initial_crm_baseline.sql";
  const baseline = await read(`supabase/migrations/${baselineName}`);
  const authorization = await read("supabase/migrations/20260720012043_crm_authorization_allowlist.sql");
  const tables = [
    "activities",
    "companies",
    "contacts",
    "cu_links",
    "cu_responses",
    "prospect_activities",
    "prospect_contacts",
    "prospect_lists",
    "prospects",
  ];

  assert.equal(migrations[0], baselineName);
  for (const table of tables) {
    assert.match(baseline, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
    assert.match(baseline, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(baseline, /create table if not exists private\.crm_authorized_users\b/i);
  assert.match(baseline, /grant select, insert, update, delete on table[\s\S]+to authenticated;/i);
  assert.doesNotMatch(baseline, /insert\s+into\s+private\.crm_authorized_users/i);
  assert.doesNotMatch(authorization, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
});
