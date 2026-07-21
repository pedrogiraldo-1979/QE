# Phase 9 RBAC Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the approved `admin`/`member` boundary in Supabase and expose the current CRM role to the frontend without implementing audit, recovery, membership administration, or the new public-link lifecycle.

**Architecture:** Keep membership authority in `private.crm_authorized_users`. Add private role helpers for RLS, expose one read-only session-context RPC, replace the shared `FOR ALL` policies with per-operation policies, and route sensitive customer-response actions through guarded admin RPC wrappers. The frontend derives visibility from the same session context, while the database remains the authoritative enforcement layer.

**Tech Stack:** PostgreSQL 17 and Supabase RLS/RPC, Supabase CLI, generated `@supabase/supabase-js` types, Next.js 16, React 19, TypeScript 5.7, Node test runner, pnpm 11.7.

## Global Constraints

- Do not execute this plan until PR #26 is merged and a separate implementation approval is recorded.
- Any migration, RLS, RPC, Auth, schema, or data mutation requires explicit approval immediately before execution.
- Never run authenticated or mutating checks against production project `izbfawwmbilmsrdjaanw`.
- Use only a disposable project whose URL ref, `QE_TEST_SUPABASE_PROJECT_REF`, and `QE_TEST_CONFIRM_DISPOSABLE_PROJECT` are identical.
- Do not add dependencies, services, secrets, environment-variable names, or Edge Function changes.
- Preserve `private.crm_authorized_users` as the authorization source; never authorize from `user_metadata` or email.
- Keep `is_crm_authorized()` compatible during this delivery.
- Do not grant hard deletion to either role; logical deletion belongs to the recovery plan.
- Do not implement audit, membership mutation, recovery, permanent purge, or link single-response semantics here.
- Keep the campaign pilot's narrower UUID/email checks unchanged.
- Every new function uses `set search_path = ''`, fully qualified relations, explicit `REVOKE`, and minimum `GRANT`.
- Regenerate `src/lib/database.types.ts`; never hand-edit generated table or RPC shapes.

---

### Task 1: Pure role model

**Files:**
- Create: `src/features/crm/authorizationModel.ts`
- Create: `tests/authorizationModel.test.mjs`

**Interfaces:**
- Consumes: the JSON returned by future RPC `get_crm_session_context()`.
- Produces: `CrmRole`, `CrmSessionContext`, `parseCrmSessionContext(value)`, `isCrmAdmin(role)`, `getAllowedDataTabs(role)`, and `coerceDataTabForRole(tab, role)`.

- [ ] **Step 1: Write the failing model tests**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  coerceDataTabForRole,
  getAllowedDataTabs,
  isCrmAdmin,
  parseCrmSessionContext,
} from "../src/features/crm/authorizationModel.ts";

test("interpreta únicamente roles CRM válidos", () => {
  assert.deepEqual(parseCrmSessionContext({ authorized: true, role: "admin" }), {
    authorized: true,
    role: "admin",
  });
  assert.deepEqual(parseCrmSessionContext({ authorized: true, role: "member" }), {
    authorized: true,
    role: "member",
  });
  assert.deepEqual(parseCrmSessionContext({ authorized: false, role: null }), {
    authorized: false,
    role: null,
  });
  assert.equal(parseCrmSessionContext({ authorized: true, role: "owner" }), null);
  assert.equal(parseCrmSessionContext(null), null);
});

test("reserva respuestas y conciliación para admin", () => {
  assert.equal(isCrmAdmin("admin"), true);
  assert.equal(isCrmAdmin("member"), false);
  assert.deepEqual(getAllowedDataTabs("admin"), ["pending", "responses", "sync"]);
  assert.deepEqual(getAllowedDataTabs("member"), ["pending"]);
  assert.equal(coerceDataTabForRole("responses", "member"), "pending");
  assert.equal(coerceDataTabForRole("sync", "admin"), "sync");
});
```

- [ ] **Step 2: Run the focused test and confirm the red state**

Run: `node --test tests/authorizationModel.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `authorizationModel.ts`.

- [ ] **Step 3: Add the minimal pure model**

```ts
export type CrmRole = "admin" | "member";
export type GovernedDataTab = "pending" | "responses" | "sync";

export interface CrmSessionContext {
  authorized: boolean;
  role: CrmRole | null;
}

export function parseCrmSessionContext(value: unknown): CrmSessionContext | null {
  if (!isRecord(value) || typeof value.authorized !== "boolean") return null;
  const role = value.role;
  if (role !== null && role !== "admin" && role !== "member") return null;
  if (value.authorized !== (role !== null)) return null;
  return { authorized: value.authorized, role };
}

export function isCrmAdmin(role: CrmRole | null): role is "admin" {
  return role === "admin";
}

export function getAllowedDataTabs(role: CrmRole | null): GovernedDataTab[] {
  return isCrmAdmin(role) ? ["pending", "responses", "sync"] : ["pending"];
}

export function coerceDataTabForRole(tab: GovernedDataTab, role: CrmRole | null): GovernedDataTab {
  return getAllowedDataTabs(role).includes(tab) ? tab : "pending";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 4: Run the focused and normal unit suites**

Run: `node --test tests/authorizationModel.test.mjs && pnpm test`

Expected: the focused file reports 2 passing tests and the full suite reports no failures.

- [ ] **Step 5: Commit the pure model**

```powershell
git add -- src/features/crm/authorizationModel.ts tests/authorizationModel.test.mjs
git commit -m "test: define CRM role behavior"
```

### Task 2: Role-aware database boundary

**Files:**
- Create with Supabase CLI: the migration returned by `supabase migration new phase_9_rbac_foundation`
- Modify: `tests/dataContracts.test.mjs`

**Interfaces:**
- Consumes: `private.crm_authorized_users(user_id, role, active)` and existing customer-response RPCs.
- Produces: `private.crm_role()`, `private.is_crm_admin()`, `private.require_crm_admin()`, `public.get_crm_session_context()`, five `public.admin_*` RPCs, and per-operation RLS policies.

- [ ] **Step 1: Verify the CLI and create the migration path without inventing a timestamp**

Run:

```powershell
supabase --version
supabase migration new --help
supabase migration new phase_9_rbac_foundation
```

Expected: Supabase prints one new path ending in `_phase_9_rbac_foundation.sql`. Save that exact returned path in `$migrationFile` for the remaining steps and confirm it is under `supabase/migrations/`.

- [ ] **Step 2: Add failing migration-contract assertions**

Append this test to `tests/dataContracts.test.mjs`. It discovers the CLI-generated filename by its stable suffix, so no timestamp or environment variable is invented:

```js
test("RBAC separa trabajo comercial y operaciones administrativas", async () => {
  const migrations = (await readdir(path.join(repositoryRoot, "supabase", "migrations")))
    .filter((name) => name.endsWith("_phase_9_rbac_foundation.sql"));
  assert.equal(migrations.length, 1);
  const migration = await read(`supabase/migrations/${migrations[0]}`);

  assert.match(migration, /create or replace function private\.crm_role\(\)/i);
  assert.match(migration, /create or replace function private\.is_crm_admin\(\)/i);
  assert.match(migration, /create or replace function public\.get_crm_session_context\(\)/i);
  assert.match(migration, /create policy crm_active_update/i);
  assert.match(migration, /create policy crm_admin_update/i);
  assert.match(migration, /revoke delete on table[\s\S]+from authenticated/i);
  assert.match(migration, /revoke execute on function public\.delete_prospect\(uuid\) from authenticated/i);
  assert.match(migration, /create or replace function public\.admin_approve_cu_response/i);
  assert.match(migration, /perform private\.require_crm_admin\(\)/i);
});
```

- [ ] **Step 3: Run the contract test and confirm the red state**

Run: `node --test --test-name-pattern="RBAC separa" tests/dataContracts.test.mjs`

Expected: FAIL because the empty migration does not contain `private.crm_role()`.

- [ ] **Step 4: Fill the generated migration with the role helpers and session context**

Add this exact SQL first:

```sql
create or replace function private.crm_role()
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select member.role
  from private.crm_authorized_users member
  where member.user_id = (select auth.uid())
    and member.active = true
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  limit 1;
$function$;

create or replace function private.is_crm_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce((select private.crm_role()) = 'admin', false);
$function$;

create or replace function private.require_crm_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not (select private.is_crm_admin()) then
    raise exception 'Insufficient CRM role' using errcode = '42501';
  end if;
end;
$function$;

create or replace function public.get_crm_session_context()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select jsonb_build_object(
    'authorized', role_value is not null,
    'role', role_value
  )
  from (select private.crm_role() as role_value) context;
$function$;

revoke execute on function private.crm_role() from public, anon, authenticated;
revoke execute on function private.is_crm_admin() from public, anon, authenticated;
revoke execute on function private.require_crm_admin() from public, anon, authenticated;
grant execute on function private.crm_role() to authenticated;
grant execute on function private.is_crm_admin() to authenticated;

revoke execute on function public.get_crm_session_context() from public, anon, authenticated;
grant execute on function public.get_crm_session_context() to authenticated;
```

Do not grant clients direct execution of `private.require_crm_admin()`; the guarded public wrappers run as their owner and call it internally while `auth.uid()` continues to identify the request JWT.

- [ ] **Step 5: Replace shared table policies with explicit commercial/admin policies**

Append:

```sql
do $block$
declare
  table_name text;
begin
  foreach table_name in array array[
    'activities', 'companies', 'contacts', 'prospect_lists',
    'prospects', 'prospect_contacts', 'prospect_activities'
  ] loop
    execute format('drop policy if exists crm_allowlist_all on public.%I', table_name);
    execute format(
      'create policy crm_active_select on public.%I for select to authenticated using ((select private.is_crm_authorized()))',
      table_name
    );
    execute format(
      'create policy crm_active_insert on public.%I for insert to authenticated with check ((select private.is_crm_authorized()))',
      table_name
    );
    execute format(
      'create policy crm_active_update on public.%I for update to authenticated using ((select private.is_crm_authorized())) with check ((select private.is_crm_authorized()))',
      table_name
    );
  end loop;

  foreach table_name in array array['cu_links'] loop
    execute format('drop policy if exists crm_allowlist_all on public.%I', table_name);
    execute format(
      'create policy crm_admin_select on public.%I for select to authenticated using ((select private.is_crm_admin()))',
      table_name
    );
    execute format(
      'create policy crm_admin_insert on public.%I for insert to authenticated with check ((select private.is_crm_admin()))',
      table_name
    );
    execute format(
      'create policy crm_admin_update on public.%I for update to authenticated using ((select private.is_crm_admin())) with check ((select private.is_crm_admin()))',
      table_name
    );
  end loop;

  drop policy if exists crm_allowlist_all on public.cu_responses;
  create policy crm_admin_select on public.cu_responses
    for select to authenticated
    using ((select private.is_crm_admin()));
end;
$block$;

revoke all privileges on table
  public.activities,
  public.companies,
  public.contacts,
  public.cu_links,
  public.cu_responses,
  public.prospect_lists,
  public.prospects,
  public.prospect_contacts,
  public.prospect_activities
from authenticated;

grant select, insert, update on table
  public.activities,
  public.companies,
  public.contacts,
  public.prospect_lists,
  public.prospects,
  public.prospect_contacts,
  public.prospect_activities
to authenticated;

grant select, insert, update on table public.cu_links to authenticated;
grant select on table public.cu_responses to authenticated;

revoke delete on table
  public.activities,
  public.companies,
  public.contacts,
  public.cu_links,
  public.cu_responses,
  public.prospect_lists,
  public.prospects,
  public.prospect_contacts,
  public.prospect_activities
from authenticated;

revoke execute on function public.delete_prospect(uuid) from public, anon, authenticated;
```

This deliberately creates no delete policy. Admin recovery is introduced only with the later soft-delete plan.

- [ ] **Step 6: Add guarded admin wrappers without rewriting the existing business functions**

Append:

```sql
create or replace function public.admin_get_cu_pending_reviews()
returns table (
  response_id uuid,
  company_id uuid,
  created_at timestamp with time zone,
  status text,
  cliente text,
  razon_social_actual text,
  nit_actual text,
  telefono_actual text,
  correo_actual text,
  direccion_actual text,
  payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_crm_admin();
  return query select * from public.get_cu_pending_reviews();
end;
$function$;

create or replace function public.admin_get_cu_master_sync_queue()
returns table (
  response_id uuid,
  company_id uuid,
  reviewed_at timestamp with time zone,
  cliente text,
  razon_social text,
  nit text,
  segmento text,
  direccion text,
  company_phone text,
  primary_contact jsonb,
  secondary_contacts jsonb,
  payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_crm_admin();
  return query select * from public.get_cu_master_sync_queue();
end;
$function$;

create or replace function public.admin_approve_cu_response(p_response_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_crm_admin();
  perform public.approve_cu_response(p_response_id);
end;
$function$;

create or replace function public.admin_reject_cu_response(p_response_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_crm_admin();
  perform public.reject_cu_response(p_response_id);
end;
$function$;

create or replace function public.admin_complete_cu_master_sync(
  p_response_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.require_crm_admin();
  perform public.complete_cu_master_sync(p_response_id, p_notes);
end;
$function$;

revoke execute on function public.get_cu_pending_reviews() from public, anon, authenticated;
revoke execute on function public.get_cu_master_sync_queue() from public, anon, authenticated;
revoke execute on function public.approve_cu_response(uuid) from public, anon, authenticated;
revoke execute on function public.reject_cu_response(uuid) from public, anon, authenticated;
revoke execute on function public.complete_cu_master_sync(uuid, text) from public, anon, authenticated;

revoke execute on function public.admin_get_cu_pending_reviews() from public, anon, authenticated;
revoke execute on function public.admin_get_cu_master_sync_queue() from public, anon, authenticated;
revoke execute on function public.admin_approve_cu_response(uuid) from public, anon, authenticated;
revoke execute on function public.admin_reject_cu_response(uuid) from public, anon, authenticated;
revoke execute on function public.admin_complete_cu_master_sync(uuid, text) from public, anon, authenticated;

grant execute on function public.admin_get_cu_pending_reviews() to authenticated;
grant execute on function public.admin_get_cu_master_sync_queue() to authenticated;
grant execute on function public.admin_approve_cu_response(uuid) to authenticated;
grant execute on function public.admin_reject_cu_response(uuid) to authenticated;
grant execute on function public.admin_complete_cu_master_sync(uuid, text) to authenticated;
```

- [ ] **Step 7: Re-run the migration-contract test**

Run: `node --test --test-name-pattern="RBAC separa" tests/dataContracts.test.mjs`

Expected: PASS.

- [ ] **Step 8: Rebuild and inspect the local database before committing**

Run:

```powershell
supabase db reset --local
supabase db advisors --local
supabase migration list --local
```

Expected: the database rebuilds from the baseline through the RBAC migration, advisors report no new security or performance errors, and the generated migration appears exactly once in the local list.

- [ ] **Step 9: Commit the migration contract**

```powershell
git add -- $migrationFile tests/dataContracts.test.mjs
git commit -m "feat: enforce CRM role boundaries"
```

### Task 3: Generated contract and role-aware session

**Files:**
- Modify generated file: `src/lib/database.types.ts`
- Modify: `src/hooks/useCrmSession.ts`
- Modify: `tests/dataContracts.test.mjs`

**Interfaces:**
- Consumes: `public.get_crm_session_context()` returning `{ authorized, role }`.
- Produces: `useCrmSession()` fields `role: CrmRole | null` and `isAdmin: boolean` while preserving existing fields.

- [ ] **Step 1: Apply the migration only to the approved disposable project**

Before any mutation, print and compare the three refs. Abort if any differ or equal production:

```powershell
$urlRef = ([Uri]$env:QE_TEST_SUPABASE_URL).Host.Split('.')[0]
$env:QE_TEST_SUPABASE_PROJECT_REF
$env:QE_TEST_CONFIRM_DISPOSABLE_PROJECT
$urlRef
```

Expected: all three values are identical and not `izbfawwmbilmsrdjaanw`.

After the explicit migration approval, run:

```powershell
supabase link --project-ref $env:QE_TEST_SUPABASE_PROJECT_REF
supabase db push --linked
supabase migration list --linked
```

Expected: only the reviewed RBAC migration is newly applied and the local/remote migration lists agree. Do not target production.

- [ ] **Step 2: Regenerate public types from the disposable project**

Run:

```powershell
supabase gen types typescript --project-id $env:QE_TEST_SUPABASE_PROJECT_REF --schema public | Set-Content -Encoding utf8 src/lib/database.types.ts
```

Expected diff: the five `admin_*` RPCs and `get_crm_session_context` appear; no manual table shape is added.

- [ ] **Step 3: Extend the contract test before changing the hook**

Add these function names to the existing `functions` array in `tests/dataContracts.test.mjs`:

```js
"admin_approve_cu_response",
"admin_complete_cu_master_sync",
"admin_get_cu_master_sync_queue",
"admin_get_cu_pending_reviews",
"admin_reject_cu_response",
"get_crm_session_context",
```

Run: `pnpm test`

Expected: PASS with the regenerated contract.

- [ ] **Step 4: Replace boolean-only access checks in `useCrmSession`**

Import the role model:

```ts
import {
  isCrmAdmin,
  parseCrmSessionContext,
  type CrmRole,
} from "@/features/crm/authorizationModel";
```

Add state:

```ts
const [role, setRole] = useState<CrmRole | null>(null);
```

Replace `checkCrmAccess()` with:

```ts
async function checkCrmAccess() {
  const { data, error } = await supabase.rpc("get_crm_session_context");
  const context = parseCrmSessionContext(data);
  return { context, error };
}
```

In `verifySession`, set `role` to `context?.role ?? null`, authorize only when `!error && context?.authorized === true`, and sign out any session that lacks that result. Clear `role` whenever there is no session or sign-out succeeds.

In `signIn`, use the same context result and preserve the existing Spanish errors. Return:

```ts
return {
  supabase,
  sessionReady,
  isAuthenticated,
  role,
  isAdmin: isCrmAdmin(role),
  signIn,
  signOut,
};
```

- [ ] **Step 5: Run static validation**

Run: `pnpm typecheck && pnpm test`

Expected: both commands exit 0.

- [ ] **Step 6: Commit generated types and session context together**

```powershell
git add -- src/lib/database.types.ts src/hooks/useCrmSession.ts tests/dataContracts.test.mjs
git commit -m "feat: expose CRM session role"
```

### Task 4: Guard administrative data flows in the frontend

**Files:**
- Modify: `src/lib/data/crmDashboardRepository.ts`
- Modify: `src/hooks/useCrmDashboardData.ts`
- Modify: `src/app/page.tsx`
- Modify: `tests/authorizationModel.test.mjs`
- Modify: `tests/dataContracts.test.mjs`

**Interfaces:**
- Consumes: `isAdmin` and `role` from `useCrmSession()`.
- Produces: no member-side requests to admin RPCs and no member-visible response, sync, or form-emission controls.

- [ ] **Step 1: Add failing source-contract assertions**

Append to `tests/dataContracts.test.mjs`:

```js
test("el frontend usa RPC administrativas y no carga sus colas para member", async () => {
  const repository = await read("src/lib/data/crmDashboardRepository.ts");
  const hook = await read("src/hooks/useCrmDashboardData.ts");
  const page = await read("src/app/page.tsx");

  assert.match(repository, /admin_get_cu_pending_reviews/);
  assert.match(repository, /admin_get_cu_master_sync_queue/);
  assert.match(repository, /admin_approve_cu_response/);
  assert.match(repository, /admin_reject_cu_response/);
  assert.match(repository, /admin_complete_cu_master_sync/);
  assert.match(hook, /adminEnabled: boolean/);
  assert.match(page, /useCrmDashboardData\(supabase, isAuthenticated, isAdmin\)/);
  assert.match(page, /isAdmin && dataTab === "responses"/);
  assert.match(page, /isAdmin && dataTab === "sync"/);
});
```

Run: `node --test --test-name-pattern="frontend usa RPC administrativas" tests/dataContracts.test.mjs`

Expected: FAIL because the repository still calls the legacy RPC names.

- [ ] **Step 2: Switch the repository to guarded RPC names**

Use these exact calls:

```ts
export function fetchPendingCustomerUpdates(client: CrmSupabaseClient) {
  return client.rpc("admin_get_cu_pending_reviews");
}

export function fetchMasterSyncQueue(client: CrmSupabaseClient) {
  return client.rpc("admin_get_cu_master_sync_queue");
}

export function reviewCustomerUpdate(
  client: CrmSupabaseClient,
  action: "approve" | "reject",
  responseId: string,
) {
  const rpcName = action === "approve" ? "admin_approve_cu_response" : "admin_reject_cu_response";
  return client.rpc(rpcName, { p_response_id: responseId });
}

export function completeMasterSync(client: CrmSupabaseClient, responseId: string) {
  return client.rpc("admin_complete_cu_master_sync", {
    p_response_id: responseId,
    p_notes: "Hoja1 y contactos_base reconciliados",
  });
}
```

- [ ] **Step 3: Prevent the dashboard hook from issuing admin requests for members**

Change the signature to:

```ts
export function useCrmDashboardData(
  supabase: CrmSupabaseClient,
  enabled: boolean,
  adminEnabled: boolean,
) {
```

At the beginning of `loadCustomerResponses` and `loadMasterSyncQueue`, clear their data/error state and return immediately when `adminEnabled` is false. In `loadData`, only start those two loaders when `adminEnabled` is true; otherwise clear both admin collections. Include `adminEnabled` in each affected callback dependency array.

- [ ] **Step 4: Gate the page with the shared role model**

Import:

```ts
import { coerceDataTabForRole, getAllowedDataTabs } from "@/features/crm/authorizationModel";
```

Read the new hook fields and pass the admin flag:

```ts
const { supabase, sessionReady, isAuthenticated, role, isAdmin, signIn, signOut } = useCrmSession();
// ...
} = useCrmDashboardData(supabase, isAuthenticated, isAdmin);
```

Add an effect that resets an unauthorized tab:

```ts
useEffect(() => {
  setDataTab((current) => coerceDataTabForRole(current, role));
}, [role]);
```

Render the `responses` and `sync` tab buttons only when `getAllowedDataTabs(role)` contains the respective value. Render the topbar “Enviar formulario de actualización” action only for `isAdmin`. Add `isAdmin &&` to the response and sync table conditions as a defensive UI boundary.

Do not change the campaign pilot route or its Edge Function authorization in this plan.

- [ ] **Step 5: Run unit, contract, and type checks**

Run: `pnpm typecheck && pnpm test`

Expected: both commands exit 0, including the new source-contract test.

- [ ] **Step 6: Commit the guarded frontend data flow**

```powershell
git add -- src/lib/data/crmDashboardRepository.ts src/hooks/useCrmDashboardData.ts src/app/page.tsx tests/authorizationModel.test.mjs tests/dataContracts.test.mjs
git commit -m "feat: hide admin CRM operations from members"
```

### Task 5: Isolated RBAC integration evidence

**Files:**
- Modify: `tests/supabase.integration.mjs`
- Modify: `docs/AUTHORIZATION.md`

**Interfaces:**
- Consumes: disposable-project admin, member, and outsider Auth accounts plus their environment variables.
- Produces: mutation-backed evidence for allowed member work, denied administrative work, admin wrappers, and disabled hard deletion.

- [ ] **Step 1: Extend the environment gate before adding tests**

Add to `requiredEnvironment`:

```js
"QE_TEST_MEMBER_EMAIL",
"QE_TEST_MEMBER_PASSWORD",
```

Document in `docs/AUTHORIZATION.md` that the disposable project must contain exactly the test admin and member memberships required by the suite; never commit their UUIDs, emails, or passwords.

- [ ] **Step 2: Sign in the member and guarantee cleanup**

After signing in the admin and outsider, add:

```js
const member = await signIn(process.env.QE_TEST_MEMBER_EMAIL, process.env.QE_TEST_MEMBER_PASSWORD);
```

Add `member.auth.signOut()` to the final `Promise.all`.

- [ ] **Step 3: Add session-context assertions**

```js
await t.test("expone el rol vigente sin confiar en metadata", async () => {
  assert.deepEqual(assertNoError(await admin.rpc("get_crm_session_context")), {
    authorized: true,
    role: "admin",
  });
  assert.deepEqual(assertNoError(await member.rpc("get_crm_session_context")), {
    authorized: true,
    role: "member",
  });
  assert.deepEqual(assertNoError(await outsider.rpc("get_crm_session_context")), {
    authorized: false,
    role: null,
  });
});
```

- [ ] **Step 4: Prove member commercial access and administrative denial**

After the admin creates the fixture, add a subtest that:

1. updates the fixture company's `notes` through `member.from("companies").update(...)` and asserts no error;
2. calls `member.rpc("admin_get_cu_pending_reviews")` and asserts error code `42501`;
3. attempts `member.from("cu_links").insert(...)` and asserts error code `42501`;
4. attempts `member.from("companies").delete().eq("id", ids.company)` and asserts error code `42501`;
5. calls the legacy `member.rpc("approve_cu_response", ...)` and asserts error code `42501` because execute was revoked.

Use only the random fixture IDs already created by the suite. Do not inspect or mutate pre-existing rows.

- [ ] **Step 5: Switch existing review tests to admin wrappers**

Replace calls to the five legacy review/sync RPCs with their `admin_*` equivalents. Preserve the existing terminal-transition assertions and cleanup.

- [ ] **Step 6: Run integration only after rechecking the disposable ref**

Run:

```powershell
$urlRef = ([Uri]$env:QE_TEST_SUPABASE_URL).Host.Split('.')[0]
if ($urlRef -ne $env:QE_TEST_SUPABASE_PROJECT_REF -or $urlRef -ne $env:QE_TEST_CONFIRM_DISPOSABLE_PROJECT -or $urlRef -eq 'izbfawwmbilmsrdjaanw') { throw 'Proyecto Supabase no autorizado para pruebas mutantes.' }
pnpm test:integration
```

Expected: all RBAC, public-form, transition, conversion, and cleanup subtests pass. Confirm the disposable project contains no fixture rows afterward, then pause or delete it according to the release checklist.

- [ ] **Step 7: Commit isolated evidence**

```powershell
git add -- tests/supabase.integration.mjs docs/AUTHORIZATION.md
git commit -m "test: verify CRM role enforcement"
```

### Task 6: Documentation, complete verification, and release gate

**Files:**
- Modify: `docs/DATA-CONTRACTS.md`
- Modify: `docs/AUDIT.md`
- Modify: `docs/AUTHORIZATION.md`
- Modify: `docs/RELEASE-CHECKLIST.md` only if the existing checklist cannot express the disposable RBAC verification.

**Interfaces:**
- Consumes: passing unit, contract, type, build, smoke, and isolated integration evidence.
- Produces: an accurate operational record of the implemented RBAC boundary and its deferred work.

- [ ] **Step 1: Update living documentation only after behavior passes**

Record these exact facts:

- `member`: read/create/update commercial entities and convert prospects;
- `admin`: same commercial access plus link/response/sync administration;
- neither role: hard delete;
- `private.crm_authorized_users`: still provisioned operationally, with no public membership-management RPC;
- audit, soft delete/recovery, membership administration, and new link lifecycle: deferred to separate approved plans;
- frontend visibility is convenience; RLS and guarded RPCs are authoritative;
- generated types and isolated-project evidence correspond to the migration.

Do not mark all of Phase 9 Stage 2 closed; this plan implements only the RBAC foundation.

- [ ] **Step 2: Run the complete non-mutating local gate**

Run: `pnpm verify`

Expected: typecheck, unit/contract tests, and production build all exit 0.

- [ ] **Step 3: Run production-server smoke locally**

Start `pnpm start` with the required `NEXT_PUBLIC_` variables from the approved non-production environment, then run `pnpm test:smoke`.

Expected: all ten route checks pass and the browser bundle hydrates; an HTTP 200 alone is not sufficient.

- [ ] **Step 4: Review the final diff and security boundary**

Run:

```powershell
git status --short
git diff --check
git diff --stat main...HEAD
git diff main...HEAD -- supabase/migrations src tests docs
```

Expected: no generated artifacts, secrets, user emails, UUIDs, test payloads, unrelated refactors, or changes under `supabase/functions/`.

- [ ] **Step 5: Obtain the independent release approval**

Before push, PR readiness, merge, migration against any shared environment, or production deployment, present:

- the full diff;
- the generated migration filename;
- advisor output;
- isolated project ref and cleanup evidence without secrets;
- unit/type/build/smoke/integration results;
- rollback plan restoring the previous policies and RPC grants;
- explicit statement that audit and recovery remain unimplemented.

- [ ] **Step 6: Commit documentation after approval**

```powershell
git add -- docs/AUTHORIZATION.md docs/DATA-CONTRACTS.md docs/AUDIT.md docs/RELEASE-CHECKLIST.md
git commit -m "docs: record CRM role enforcement"
```

The implementing PR remains separate from PR #26 and must not be merged automatically.
