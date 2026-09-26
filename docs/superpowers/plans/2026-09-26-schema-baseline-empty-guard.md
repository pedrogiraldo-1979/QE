# Empty-Project Guard for Schema Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `executing-plans` inline. Do not delegate without Pedro's explicit request. Track each checkbox and stop at any project-identity, cost, data, or production gate.

**Goal:** make `supabase/baselines/qe2026-schema-only.sql` refuse an existing or partially created CRM before any schema or privilege change.

**Architecture:** prepend one PostgreSQL `DO` block that checks the eleven relations managed by the replay with `to_regclass`. A matching relation raises a generic exception. Keep the original replay body byte-for-byte unchanged; validate the refusal on the existing disposable project and pause it again.

**Tech Stack:** PostgreSQL 17, Supabase connector, Node test runner, pnpm 11.7.0.

## Global Constraints

- Work only on `codex/schema-only-baseline` and the existing draft PR #34; do not merge.
- QE2026 (`izbfawwmbilmsrdjaanw`) is read-only and must receive no SQL, including the guard alone.
- The only live test target is the existing disposable project `hsuxurarysmvmprgdeqo` in «Quindi Exquisito»; confirm its ID and name twice before restoring it.
- No new project, data rows, Auth users, membership changes, package, environment variable, migration-history repair, or `db push`.
- Preserve the untracked `.pnpm-store/`; do not stage generated Next.js artifacts or the ten historical migration files.

---

### Task 1: Test-first guard

**Files:** modify `tests/schemaBaseline.test.mjs` and `supabase/baselines/qe2026-schema-only.sql`.

- [x] Add this focused contract test after the existing existence test:

```js
test('la baseline rechaza un CRM existente antes de cualquier DDL', { skip: !baselineExists }, () => {
  const executable = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\r\n]*/g, '').trimStart();
  const guard = executable.match(/^do \$qe_empty_guard\$([\s\S]*?)\$qe_empty_guard\$;/i);
  assert.ok(guard, 'La primera instrucción ejecutable debe ser la guarda');
  for (const relation of [
    'public.companies', 'public.contacts', 'public.activities', 'public.cu_links',
    'public.cu_responses', 'public.campaign_pilot_recipients', 'public.prospect_lists',
    'public.prospects', 'public.prospect_contacts', 'public.prospect_activities',
    'private.crm_authorized_users',
  ]) {
    assert.ok(guard[1].includes(`to_regclass('${relation}') is not null`), relation);
  }
  assert.match(guard[1], /raise exception 'QE schema-only baseline requires an empty CRM schema'/i);
});
```

- [x] Run `node --test tests/schemaBaseline.test.mjs`. Expect exactly one failed test with “La primera instrucción ejecutable debe ser la guarda”; the existing four tests stay green.
- [x] Insert this block after the three introductory comments and before `-- Source: 20260720000000_initial_crm_baseline.sql`:

```sql
-- Fail closed before changing any schema object or privilege.
do $qe_empty_guard$
begin
  if to_regclass('public.companies') is not null
    or to_regclass('public.contacts') is not null
    or to_regclass('public.activities') is not null
    or to_regclass('public.cu_links') is not null
    or to_regclass('public.cu_responses') is not null
    or to_regclass('public.campaign_pilot_recipients') is not null
    or to_regclass('public.prospect_lists') is not null
    or to_regclass('public.prospects') is not null
    or to_regclass('public.prospect_contacts') is not null
    or to_regclass('public.prospect_activities') is not null
    or to_regclass('private.crm_authorized_users') is not null
  then
    raise exception 'QE schema-only baseline requires an empty CRM schema';
  end if;
end
$qe_empty_guard$;
```

- [x] Run `node --test tests/schemaBaseline.test.mjs` again. Expect five passing tests and no failures. Confirm the original SQL body is unchanged after the new prefix.

### Task 2: Isolated refusal test and evidence

**Files:** modify only `docs/AUDIT.md` after observing results.

- [x] Use Supabase `get_project` and `list_projects` to confirm twice that `hsuxurarysmvmprgdeqo` is `QE Schema Baseline Temp 2026-09-25`, belongs to «Quindi Exquisito», is distinct from QE2026, and is `INACTIVE`. Do not continue if any identity differs.
- [x] Use `restore_project` for this project only and wait for `ACTIVE_HEALTHY`. Obtain a read-only catalog fingerprint from `pg_catalog` for managed relations, columns, constraints, indexes, functions, policies and grants, plus only zero/nonzero row counts for the ten CRM tables, the private membership table and `auth.users`. Do not output row contents or personal identifiers.

Use the same read-only fingerprint query before and after the refused replay; compare both `object_count` and `fingerprint`:

```sql
with signatures as (
  select 'relation|' || n.nspname || '.' || c.relname || '|' || c.relkind::text || '|' || c.relrowsecurity::text as value
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'p', 'v', 'm')
  union all
  select 'column|' || table_schema || '.' || table_name || '.' || column_name || '|' || data_type || '|' || is_nullable || '|' || coalesce(column_default, '')
  from information_schema.columns where table_schema in ('public', 'private')
  union all
  select 'constraint|' || n.nspname || '.' || r.relname || '|' || c.conname || '|' || pg_get_constraintdef(c.oid)
  from pg_constraint c join pg_class r on r.oid = c.conrelid join pg_namespace n on n.oid = r.relnamespace
  where n.nspname in ('public', 'private')
  union all
  select 'index|' || schemaname || '.' || indexname || '|' || indexdef
  from pg_indexes where schemaname in ('public', 'private')
  union all
  select 'function|' || n.nspname || '.' || p.proname || '|' || md5(pg_get_functiondef(p.oid))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
  union all
  select 'policy|' || schemaname || '.' || tablename || '|' || policyname || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '')
  from pg_policies where schemaname in ('public', 'private')
  union all
  select 'table_grant|' || table_schema || '.' || table_name || '|' || grantee || '|' || privilege_type
  from information_schema.role_table_grants where table_schema in ('public', 'private')
  union all
  select 'routine_grant|' || routine_schema || '.' || routine_name || '|' || grantee || '|' || privilege_type
  from information_schema.routine_privileges where routine_schema in ('public', 'private')
)
select count(*) as object_count, md5(string_agg(value, E'\n' order by value)) as fingerprint from signatures;
```

For data, use only `SELECT count(*)` subqueries for `public.companies`, `public.contacts`, `public.activities`, `public.cu_links`, `public.cu_responses`, `public.campaign_pilot_recipients`, `public.prospect_lists`, `public.prospects`, `public.prospect_contacts`, `public.prospect_activities`, `private.crm_authorized_users`, and `auth.users`; require each to remain zero.
- [x] Submit the complete guarded SQL through `execute_sql` with `project_id: 'hsuxurarysmvmprgdeqo'`. Expect only the guard exception; if execution succeeds, stop and report a safety failure before any other action. Re-read the same catalog fingerprint and counts; require exact equality.
- [x] Pause the project through `pause_project`, wait until `get_project` says `INACTIVE`, and record the observed rejection and unchanged state in an appended `docs/AUDIT.md` note. If a verification fails, still pause the project before reporting the blocker.

### Task 3: Local verification and PR update

**Files:** only `tests/schemaBaseline.test.mjs`, `supabase/baselines/qe2026-schema-only.sql`, `docs/AUDIT.md`, and this plan.

- [x] Run `pnpm typecheck`, `pnpm test`, `pnpm build`, then `pnpm start` and `pnpm test:smoke`; stop the server. Restore any build-only change to `next-env.d.ts` with `apply_patch` without touching user files.
- [x] Review `git diff --check`, changed/staged paths, no top-level DML, no emails/UUID/token fixtures, and no changes to `supabase/migrations/`; stage only the four named files.
- [ ] Commit descriptively, push the existing branch, keep PR #34 a draft, and wait for CI and Vercel. Do not merge or execute SQL in QE2026.

## Verification Limit

The previous SQL body passed on a fresh empty project before this guard existed. This task verifies the new refusal path in the existing project. It does not claim a fresh full replay of the guarded file or functional parity of `get_cu_pending_reviews`, whose two omitted test predicates remain documented.
