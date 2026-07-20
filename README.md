# Quindío Exquisito CRM MVP

MVP CRM for Quindío Exquisito prospecting and follow-up.

## What this app includes

- Supabase login gate using email/password.
- Companies dashboard with search, segment filters, and status filters.
- Company detail view with company data, contacts, notes, and activity history.
- Contacts table.
- Activity/follow-up creation with due date.
- Status updates for companies.

## Supabase tables expected

The app expects these existing tables:

- `companies`
- `contacts`
- `activities`

The initial import should already contain:

- 82 companies
- 82 contacts
- 82/82 contacts linked through `contacts.company_id`

## Environment variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

The public Supabase values are already included in `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://izbfawwmbilmsrdjaanw.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_cDOIp7vIy26upnmBdNUBKg_HBcqDqWd
```

Do not put a Supabase `service_role` key in this app. This is a browser-facing MVP and should only use the publishable key.

## Auth setup

Creating a Supabase Auth user is not enough to access the CRM. The user must also be active in the private CRM allowlist documented in `docs/AUTHORIZATION.md`.

1. Supabase Dashboard → Authentication → Users
2. Add the user
3. Add its generated UUID to `private.crm_authorized_users` through a reviewed migration
4. Use that email/password to log into the app

Keep public signups disabled. A signed-in user outside the allowlist is logged out by the frontend and receives no CRM rows under RLS.

## Local development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The repository uses `pnpm@11.7.0`. Node `24.14.0` is recorded in `.nvmrc`; Next.js requires Node 20.9 or newer.

Open:

```txt
http://localhost:3000
```

## Build

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Repository structure

Application code under `src/` is canonical. Dashboard rules and formatters live in `src/features/crm/`, shared data/session hooks in `src/hooks/`, and domain views in `src/components/crm/`. The audited legacy duplicates at the repository root were removed during the approved cleanup phase.

## Internal ZeptoMail test

The internal-only test route is available at `/prueba-correo`. It invokes the authenticated Supabase Edge Function `send-internal-update-test` and is restricted to the authorized CRM user and the fixed recipient `pedro.giraldo@gmail.com`.

The ZeptoMail authorization token must remain in Supabase Edge Function secrets. Supported secret names are:

- `ZEPTOMAIL_SEND_TOKEN`
- `ZEPTOMAIL_SEND_MAIL_TOKEN`
- `ZEPTOMAIL_API_TOKEN`
- `ZEPTOMAIL_TOKEN`
- `ZEPTOMAIL_API_KEY`

Do not add the ZeptoMail token to the repository or to any `NEXT_PUBLIC_` environment variable.

## Suggested next iterations

1. Split contacts with multiple emails into separate contact rows.
2. Add ownership/roles before inviting other users.
3. Add CSV re-import/update workflow from Google Sheets.
4. Add priority fields and next action dates to `companies`.
5. Add email/WhatsApp templates only after data quality improves.
