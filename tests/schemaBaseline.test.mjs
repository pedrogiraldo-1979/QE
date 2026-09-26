import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const baselinePath = path.join(process.cwd(), 'supabase', 'baselines', 'qe2026-schema-only.sql');
const baselineExists = existsSync(baselinePath);
const sql = baselineExists ? readFileSync(baselinePath, 'utf8') : '';

test('la baseline estructural aislada existe fuera de migrations', () => {
  assert.equal(baselineExists, true, `Falta ${baselinePath}`);
});

test('la baseline no carga datos ni identidades reales', { skip: !baselineExists }, () => {
  const withoutComments = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\r\n]*/g, '');
  const outsideFunctions = withoutComments.replace(
    /\bas\s+\$([a-z_]*)\$[\s\S]*?\$\1\$/gi,
    'as <function-body>',
  );

  assert.doesNotMatch(outsideFunctions, /^\s*(?:insert|update|delete|truncate)\b/gim);
  assert.doesNotMatch(sql, /\bwith\s+target_data\s*\(/i);
  assert.doesNotMatch(sql, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  assert.doesNotMatch(sql, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  assert.doesNotMatch(sql, /\bl\.token\s*<>|\bc\.name\s*<>/i);
});

test('la baseline incluye el lote productivo y la campaña sólo como esquema', { skip: !baselineExists }, () => {
  assert.match(sql, /alter\s+table\s+public\.campaign_pilot_recipients\s+add\s+column\s+if\s+not\s+exists\s+batch_key\s+text/i);
  assert.match(sql, /unique\s*\(batch_key,\s*sequence\)/i);
  assert.match(sql, /unique\s*\(batch_key,\s*link_id\)/i);
  assert.match(sql, /campaign_pilot_recipients_batch_status_idx/i);
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.claim_campaign_batch\s*\(/i);
  assert.match(sql, /alter\s+table\s+public\.prospects\s+add\s+column\s+if\s+not\s+exists\s+campaign\s+text/i);
});

test('la baseline conserva la superficie administrativa RBAC', { skip: !baselineExists }, () => {
  for (const name of [
    'get_crm_session_context',
    'admin_get_cu_pending_reviews',
    'admin_approve_cu_response',
    'admin_reject_cu_response',
    'admin_get_cu_master_sync_queue',
    'admin_complete_cu_master_sync',
  ]) {
    assert.match(sql, new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\s*\\(`, 'i'));
  }
});
