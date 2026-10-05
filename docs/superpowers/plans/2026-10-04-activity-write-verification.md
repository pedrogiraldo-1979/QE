# Confirmed Activity Writes Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline for this bounded unit, subject to QE approval gates.

**Goal:** Announce success only after one matching activity ID is returned by the update.

**Architecture:** Keep both handlers in the existing workbench. Request only `id` from the same update, retaining its table, filter and patch. Reject unconfirmed results without automatic retry or loss of the reschedule draft.

**Tech Stack:** Existing React, TypeScript, Supabase client and Node test runner.

## Global Constraints

No routes/module extraction, dependencies, environment variables, schema, permissions, migrations or production data changes. Publication and remote mutable tests require separate approval. Preserve unrelated original checkout changes.

### Task 1: Handler tests and minimal implementation

Files: `tests/activityFeedback.test.mjs`, `src/components/ActivitiesOperationalWorkbench.tsx`.

- [x] Extend the transport substitute so the existing `eq` result is awaitable and supports `select`; record selected columns and count reloads. Default response is `[{ id }]`.
- [x] For each source and action, test empty/null data, mismatching ID, multiple IDs, explicit error and transport exception. Assert generic warning, no reload, one attempt, and retained reschedule draft/form with saving released. Successful existing tests must assert `select("id")`.
- [x] Run `node --test tests/activityFeedback.test.mjs`; observe failures because current handlers announce success on empty/mismatching results and do not handle completion transport exceptions.
- [x] Add `.select("id")` to both updates and require `!error && data?.length === 1 && data[0].id === activity.id`. Keep success text/refresh only behind this check. Catch completion exceptions with the same generic unconfirmed warning; retain reschedule finally/cancel/focus logic.

```typescript
const { data: updated, error } = await supabase.from(table)
  .update(patch).eq("id", activity.id).select("id");
if (error || updated?.length !== 1 || updated[0].id !== activity.id) {
  setMessage("No se pudo confirmar la actualización de la actividad. Actualiza la lista antes de intentar de nuevo.");
  return;
}
```

- [x] Run targeted tests and ensure all old date/cancel/focus/confirmation cases still pass.

### Task 2: Verification and evidence

Files: `docs/AUDIT.md` and this plan.

- [x] Run `pnpm verify`; start the production build on unused port 3001 and run `CRM_BASE_URL=http://127.0.0.1:3001 pnpm test:smoke`. Stop the server after testing.
- [x] Record exact local results and limitations in AUDIT; do not claim authenticated persistence or complete ACT-02.
- [x] Review `git diff --check` and changed paths for scope/secrets/generated metadata. Restore generated tracked metadata only to its known original content.
- [x] Commit only this implementation, tests and associated documentation; no push, merge or deployment.
