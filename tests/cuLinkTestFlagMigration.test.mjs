import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const migrationDir = path.join(process.cwd(), 'supabase', 'migrations');
const candidates = readdirSync(migrationDir).filter((name) =>
  /^\d{14}_add_cu_link_test_flag\.sql$/.test(name),
);

test('la Etapa 1 contiene una sola migración aditiva y ningún cambio de datos o permisos', () => {
  assert.equal(candidates.length, 1, 'Debe existir una sola migración creada por la CLI');
  const sql = readFileSync(path.join(migrationDir, candidates[0]), 'utf8').replace(/\r\n?/g, '\n').trim();
  assert.equal(sql, 'alter table public.cu_links\n  add column is_test boolean not null default false;');
});
