# QE2026 Schema-Only Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `executing-plans` inline. Do not delegate subagents without Pedro's explicit request. Track each checkbox; stop at any cost, data, or production gate.

**Goal:** publish a standalone, data-free SQL baseline for new isolated Supabase projects, with reproducible catalog evidence and no production changes.

**Architecture:** build one SQL file under `supabase/baselines/`, not `supabase/migrations/`, from the already verified local schema replay plus six later structural/functional deltas. Exclude all top-level DML and the two production-only literal filters. Verify first with a failing contract test, then against a fresh disposable project and the read-only production catalog.

**Tech Stack:** PostgreSQL 17, Supabase connector, Node test runner, pnpm 11.7.0.

## Global Constraints

- QE2026 ref `izbfawwmbilmsrdjaanw` is read-only; never run DDL/DML, `db push`, or `migration repair` there.
- Keep the ten existing migration files unchanged. Do not add files under `supabase/migrations/`.
- Do not include or copy real members, contacts, prospects, email addresses, UUIDs, tokens, or campaign rows.
- No new packages, environment variables, Edge Functions, Auth changes, frontend changes, or ERP work.
- Apply SQL only to a newly confirmed disposable project; pause it after verifying it contains zero CRM/Auth rows.
- If Supabase displays a nonzero cost for the new project, obtain a fresh approval before creation.

---

### Task 1: Contract and source review

**Files:** create `tests/schemaBaseline.test.mjs`; read the ten existing SQL files and the six remote-only historical entries listed in PR #32.

- [x] Add Node tests that require `supabase/baselines/qe2026-schema-only.sql`, assert no top-level `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`, no email/UUID/token fixture, and require `batch_key`, both composite unique constraints, the batch-status index, `claim_campaign_batch`, and all six RBAC RPC. The tests must parse dollar-quoted function bodies separately so internal DML remains allowed.
- [x] Run `node --test tests/schemaBaseline.test.mjs`; confirm it fails specifically because the SQL file is absent.
- [x] Re-read the relevant local SQL and the six remote versions `20260722031506`, `20260722034019`, `20260722034030`, `20260722034045`, `20260722142520`, `20260804203513` without printing sensitive literals.

### Task 2: Standalone SQL

**Files:** create `supabase/baselines/qe2026-schema-only.sql`; do not modify `supabase/migrations/`.

- [x] Use `apply_patch` to create the baseline, with source-version comments. Concatenate the first eight local migrations in their filename order, preserving their SQL. Insert the six remote-only deltas in chronological order after `20260721170728`; omit the `UPDATE` in `20260722034019`, omit the `UPDATE` in `20260722142520`, and remove only the two QE2026-specific literal predicates from the final `get_cu_pending_reviews` definition. Add the two DDL statements before `with target_data (` from local `20260826000000`, omitting its 31-row campaign data. Append local `20260917000000` RBAC. No other source transformation is allowed.
- [x] Run the focused contract test; fix only failed structural requirements, then rerun the full `pnpm test` and `pnpm typecheck`.
- [x] Inspect the diff and verify zero tracked changes to the ten existing SQL files, zero secrets/real data, and zero top-level DML in the new file.

### Task 3: Isolated catalog comparison

**Files:** update `docs/AUDIT.md` and `docs/DECISIONS.md` only with observed results; keep the design and this plan in the PR.

- [x] Confirm a new disposable project in «Quindi Exquisito» and its displayed cost. If cost is nonzero, stop and ask Pedro. Confirm its ref/name twice and ensure neither equals QE2026.
- [x] Confirm zero CRM rows and Auth users, apply the baseline to the new project only, then compare tables/RLS, columns, constraints, indexes, policies, functions, grants and generated types against QE2026. Record the explicit difference of the two omitted literal predicates; do not claim exact function-text parity.
- [x] Run Supabase security advisors, query counts again, and pause the project. Verify `INACTIVE` before reporting cleanup complete.
- [x] Add a decision entry stating that the standalone baseline is for empty projects only, not a production migration or permission to repair history; record comparison counts and any remaining differences in `docs/AUDIT.md`.

### Task 4: Publish a separate PR

**Files:** only the new baseline, focused test, design/plan, `docs/DECISIONS.md`, and `docs/AUDIT.md`.

- [x] Run `pnpm typecheck`, `pnpm test`, `pnpm build`, and the repository's smoke test if the build environment is available. Review `git diff --check`, exact staged paths and secret/data scan.
- [ ] Commit on `codex/schema-only-baseline`, push, and open a draft PR against `main`; do not merge. Wait for CI and Vercel checks and report their exact state.

## Out of scope

No production SQL, history repair, automatic `db push`, campaign seed, authenticated fixture suite, real email, or release to main.
