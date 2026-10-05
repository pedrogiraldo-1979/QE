# Inline Activity Rescheduling Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, subject to QE approval gates. No delegation is required for this bounded change.

**Goal:** Replace the native prompt with the approved inline date form.

**Architecture:** Keep state, date validation, handlers and form in the existing workbench. Preserve the source/table/ID update contract and the message-preserving refresh.

**Tech Stack:** Existing React, TypeScript, Next.js and Node test runner.

## Global Constraints

No new routes, dependencies, environment variables, database changes or publication. Preserve unrelated workspace changes. Remote mutable verification, if performed, requires an explicitly confirmed disposable project; never production.

### Task 1: Date and handler regression tests

Files: `tests/activityFeedback.test.mjs`, `src/components/ActivitiesOperationalWorkbench.tsx`.

- [x] Adapt the handler harness to pass the date explicitly rather than through `window.prompt`; capture editing/saving setters and pending-focus refs.
- [x] Add assertions for empty/invalid/impossible dates, leap days, cancelling without writes, blocked duplicate submissions and retained error values. Example cases: `2026-02-29` false, `2024-02-29` true, `2026-10-04` true.
- [x] Run `node --test tests/activityFeedback.test.mjs`; establish expected failing assertions before implementation.
- [x] Implement `isValidActivityDate(value: string): boolean` using the exact YYYY-MM-DD pattern, year 0001–9999 and UTC ISO round-trip; do not restrict past dates.
- [x] Implement explicit-date handler with guarded saving, generic error, existing patch `{ due_date: nextDate, completed: false }`, preserved confirmation and refresh.

### Task 2: Inline form and accessible focus

Files: `src/components/ActivitiesOperationalWorkbench.tsx`, `src/app/activities-operational-workbench.css`.

- [x] Introduce selected activity, draft date and saving state; keep an in-flight ref to block duplicate submissions synchronously.
- [x] Reprogramar opens only the chosen row's form, prefilled with existing date or current reference date. Render labelled `type=date` input with autofocus, Guardar and Cancelar.
- [x] Cancel/Escape close without writes. On inactive view discard edit. Restore focus to the originating button, or workbench heading when reload removes the row.
- [x] Disable date, form actions, refresh and row actions while saving. Retain draft/form on failure. Use `role=status` for the workbench message.
- [x] Add full-width, wrapping grid form styles so the date input does not expand a 390px document.
- [x] Run the targeted tests, then `pnpm verify` and `pnpm test:smoke` against a production server on an unused port.

### Task 3: Review and evidence

Files: `docs/AUDIT.md` and this plan.

- [x] Review the complete diff for scope and generated artifacts; restore generated tracked metadata to its original content.
- [x] Inspect opening, focus, cancel/Escape and responsive form in a controlled browser fixture without real credentials. Record precisely if authenticated persistence remains untested.
- [x] Document verified evidence and limits; do not close ACT-02 on handler tests alone.
- [x] Commit only implementation, tests and associated documentation locally. No push, merge or deployment.
