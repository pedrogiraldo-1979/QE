# Quindío Exquisito CRM - Codex Guidelines

## Project context

This repository contains the Quindío Exquisito CRM MVP built with Next.js, TypeScript, Supabase and Vercel.

The app supports:

- Current customer/company management
- Contacts
- Activities and follow-ups
- Customer data update forms
- Prospecting lists and prospecting activities

## Working rules for Codex

- Keep the UI language in Spanish.
- Do not expose or create `service_role` Supabase keys in frontend code.
- Do not modify environment variable names unless explicitly requested.
- Do not modify `src/app/actualizar-datos/page.tsx` unless the task is specifically about the public customer update form.
- Do not mix prospecting records with existing customer records in `companies` until a prospect is intentionally converted.
- Use the prospecting tables for prospecting workflows:
  - `prospect_lists`
  - `prospects`
  - `prospect_contacts`
  - `prospect_activities`
- Keep prospecting UI simple and commercial. Do not show enrichment/research-only fields unless specifically requested.
- Prefer small, focused changes over large rewrites.
- Keep `src/app/page.tsx` as an orchestrator when possible. Prefer extracting larger UI sections into components under `src/components/`.

## Suggested structure

Use this structure for new modules when possible:

```txt
src/components/crm/
src/components/prospecting/
src/lib/types.ts
src/lib/supabase.ts
```

## UI conventions

Reuse existing classes when possible:

- `card`
- `btn`
- `btn-primary`
- `btn-secondary`
- `input`
- `select`
- `textarea`
- `badge`

## Validation before finishing

Before finalizing a coding task, run:

```bash
npm run typecheck
npm run build
```

If either command fails, report the error and fix it when possible.

## Current prospecting pilot

The first pilot list is already loaded in Supabase:

```txt
Colegios privados Bogotá - piloto
```

It contains 80 school prospects and one initial validation activity per prospect.

The first prospecting UI should focus on:

- List selection
- Prospect table
- Search by name
- Filters by status and priority
- Prospect detail panel
- Prospect activities
- Marking activities completed
- Creating new prospecting activities
- A visual placeholder for “Convertir a cliente”
