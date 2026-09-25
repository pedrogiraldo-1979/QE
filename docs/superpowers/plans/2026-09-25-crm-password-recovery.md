# CRM Password Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add self-service password recovery for every authorized CRM user without changing Supabase configuration or accounts during development.

**Architecture:** The browser's existing Supabase client requests the recovery email and handles the returned Auth session. Two small public routes handle request and password change; the latter checks the existing CRM allowlist RPC before calling `updateUser`. The existing dashboard login only gains a link.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `@supabase/supabase-js` 2.x, Node test runner, pnpm 11.7.0.

## Global Constraints

- Base branch: `main`; work only on `codex/crm-password-recovery`.
- No new package, service, environment variable, migration, RLS/RPC/Auth setting, user mutation, or real email in development.
- No merge or production deployment as part of this plan.
- Never log email, password, recovery URL/token, UUID or session payload.
- Supabase's configured password policy is authoritative; local validation checks only matching nonempty fields.
- A recovery session does not grant CRM access; enforce `get_crm_session_context` before changing the password.
- Use `signOut({ scope: "local" })` after success or rejected CRM authorization; default global sign-out would revoke other sessions.
- Preview validation requires a later, separately approved exact redirect URL in Supabase Auth; never add a broad preview wildcard.
- Preserve the unrelated untracked `.pnpm-store/` directory and never stage it.

## File map

- `src/features/crm/passwordRecovery.ts`: pure URL/validation helpers and generic copy; no Supabase client.
- `src/app/recuperar-clave/page.tsx`: request form and generic confirmation.
- `src/app/restablecer-clave/page.tsx`: session/allowlist gate and password update form.
- `src/app/page.tsx`: recovery link beside existing sign-in.
- `src/app/globals.css`: only minimal styles if existing login classes are insufficient.
- `tests/passwordRecovery.test.mjs`: pure helper and page contract tests.
- `scripts/smoke.mjs`: add the two public routes.
- `docs/AUDIT.md`: record that code exists on a branch but live delivery remains unverified; do not mark the feature published.

---

### Task 1: Recovery contract and login entry

**Files:** Create `src/features/crm/passwordRecovery.ts`; modify `src/app/page.tsx`; test `tests/passwordRecovery.test.mjs`.

**Interfaces:** Produce `recoveryRedirectUrl(origin: string): string`, `validateRecoveryPassword(password: string, confirmation: string): string | null`, and `RECOVERY_REQUEST_CONFIRMATION: string`.

- [ ] **Step 1: Write failing helper and entry tests.** Create `tests/passwordRecovery.test.mjs` with Node's `node:test`, `assert/strict` and `readFile` imports. Test `recoveryRedirectUrl("https://preview.example") === "https://preview.example/restablecer-clave"`; test rejection of empty/different passwords and acceptance of matching nonempty passwords; read `src/app/page.tsx` and assert it contains `href="/recuperar-clave"`.
- [ ] **Step 2: Run `node --test tests/passwordRecovery.test.mjs`.** Expect failure because the helper file and login link do not exist.
- [ ] **Step 3: Create the helper with this exact contract:**

```ts
export const RECOVERY_REQUEST_CONFIRMATION =
  "Si el correo corresponde a una cuenta, recibirás instrucciones para restablecer la contraseña.";

export function recoveryRedirectUrl(origin: string): string {
  return new URL("/restablecer-clave", origin).toString();
}

export function validateRecoveryPassword(password: string, confirmation: string): string | null {
  if (!password || !confirmation) return "Completa ambos campos.";
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  return null;
}
```

- [ ] **Step 4: Add `<Link href="/recuperar-clave">¿Olvidaste tu contraseña?</Link>` immediately after the login form in `src/app/page.tsx`.** Reuse existing accessible focus styles; do not change sign-in logic.
- [ ] **Step 5: Run `node --test tests/passwordRecovery.test.mjs` and `pnpm typecheck`.** Expect all tests and typecheck to pass.
- [ ] **Step 6: Review the diff and commit only Task 1 files:** `git add src/features/crm/passwordRecovery.ts src/app/page.tsx tests/passwordRecovery.test.mjs`; `git commit -m "feat: add CRM recovery entry and validation contract"`.

### Task 2: Request page without account enumeration

**Files:** Create `src/app/recuperar-clave/page.tsx`; extend `tests/passwordRecovery.test.mjs`.

**Interfaces:** Consume `RECOVERY_REQUEST_CONFIRMATION` and `recoveryRedirectUrl`; use the existing `getSupabaseClient()`.

- [ ] **Step 1: Add a failing source-contract test.** Read `src/app/recuperar-clave/page.tsx`; assert it calls `resetPasswordForEmail`, uses `recoveryRedirectUrl(window.location.origin)`, and renders `RECOVERY_REQUEST_CONFIRMATION` after success. Assert it contains no hard-coded user email, `service_role` or `console.log`.
- [ ] **Step 2: Run the focused test.** Expect `ENOENT` for the route.
- [ ] **Step 3: Create `src/app/recuperar-clave/page.tsx` with this complete page:**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { RECOVERY_REQUEST_CONFIRMATION, recoveryRedirectUrl } from "@/features/crm/passwordRecovery";
import { getSupabaseClient } from "@/lib/supabase";

export default function RequestPasswordRecoveryPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      const result = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: recoveryRedirectUrl(window.location.origin),
      });
      if (result.error) {
        setError(true);
      } else {
        setEmail("");
        setSent(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <h1>Recuperar contraseña</h1>
        <p>Escribe el correo de tu cuenta del CRM.</p>
        {sent ? (
          <p role="status" aria-live="polite">{RECOVERY_REQUEST_CONFIRMATION}</p>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <label className="field-label">
              Correo electrónico
              <input className="input" type="email" autoComplete="email" value={email}
                onChange={(event) => setEmail(event.target.value)} required />
            </label>
            {error ? <p role="alert" className="alert alert-danger">No se pudo enviar la solicitud. Intenta de nuevo más tarde.</p> : null}
            <button className="btn btn-primary full-width" type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        )}
        <Link href="/">Volver al acceso</Link>
      </section>
    </main>
  );
}
```
- [ ] **Step 4: Run the focused test and `pnpm typecheck`.** Expect both to pass; manually inspect that success copy is identical regardless of account existence.
- [ ] **Step 5: Review and commit:** `git add src/app/recuperar-clave/page.tsx tests/passwordRecovery.test.mjs`; `git commit -m "feat: request CRM password recovery email"`.

### Task 3: Protected change page

**Files:** Create `src/app/restablecer-clave/page.tsx`; extend `tests/passwordRecovery.test.mjs`.

**Interfaces:** Consume `validateRecoveryPassword`, `getSupabaseClient`, `parseCrmSessionContext`. Use `getSession`, `get_crm_session_context`, `updateUser` and local-scope `signOut`.

- [ ] **Step 1: Add failing source-contract tests.** Assert the new page checks `getSession()` and `get_crm_session_context` before rendering an enabled password form, calls `validateRecoveryPassword`, calls `updateUser({ password })` only after authorization, and uses `signOut({ scope: "local" })`. Assert no `service_role`, `console.log` or rendered token/hash.
- [ ] **Step 2: Run the focused test.** Expect `ENOENT`.
- [ ] **Step 3: Create `src/app/restablecer-clave/page.tsx` with this complete page.** The recovery token is handled by the existing Supabase browser client, not by application code.

```tsx
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { parseCrmSessionContext } from "@/features/crm/authorizationModel";
import { validateRecoveryPassword } from "@/features/crm/passwordRecovery";
import { getSupabaseClient } from "@/lib/supabase";

type Phase = "checking" | "ready" | "invalid" | "verification-error" | "saving" | "done";

export default function SetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");

  const verify = useCallback(async () => {
    setPhase("checking");
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setPhase("invalid");
        return;
      }
      const access = await supabase.rpc("get_crm_session_context");
      if (access.error) {
        setPhase("verification-error");
        return;
      }
      if (parseCrmSessionContext(access.data)?.authorized !== true) {
        await supabase.auth.signOut({ scope: "local" });
        setPhase("invalid");
        return;
      }
      setPhase("ready");
    } catch {
      setPhase("verification-error");
    }
  }, []);

  useEffect(() => {
    void verify();
  }, [verify]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "ready") return;
    const validation = validateRecoveryPassword(password, confirmation);
    if (validation) {
      setMessage(validation);
      return;
    }
    setPhase("saving");
    setMessage("");
    try {
      const supabase = getSupabaseClient();
      const updated = await supabase.auth.updateUser({ password });
      setPassword("");
      setConfirmation("");
      if (updated.error) {
        setMessage("No se pudo cambiar la contraseña. Revisa los requisitos e intenta de nuevo.");
        setPhase("ready");
        return;
      }
      let signedOut = false;
      try {
        signedOut = !(await supabase.auth.signOut({ scope: "local" })).error;
      } catch {
        signedOut = false;
      }
      setMessage(!signedOut
        ? "Contraseña cambiada. Cierra esta ventana antes de volver a entrar."
        : "Contraseña cambiada. Ya puedes iniciar sesión.");
      setPhase("done");
    } catch {
      setPassword("");
      setConfirmation("");
      setMessage("No se pudo completar el cambio. Intenta de nuevo.");
      setPhase("ready");
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <h1>Restablecer contraseña</h1>
        {phase === "checking" ? <p role="status">Validando enlace...</p> : null}
        {phase === "invalid" ? <p role="alert">Enlace no disponible o vencido.</p> : null}
        {phase === "verification-error" ? (
          <div role="alert">
            <p>No se pudo verificar el acceso. Intenta de nuevo.</p>
            <button className="btn" type="button" onClick={() => void verify()}>Reintentar</button>
          </div>
        ) : null}
        {(phase === "ready" || phase === "saving") ? (
          <form className="form-stack" onSubmit={submit}>
            <label className="field-label">Nueva contraseña
              <input className="input" type="password" autoComplete="new-password" value={password}
                onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <label className="field-label">Confirmar contraseña
              <input className="input" type="password" autoComplete="new-password" value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)} required />
            </label>
            {message ? <p role="alert" className="alert alert-danger">{message}</p> : null}
            <button className="btn btn-primary full-width" type="submit" disabled={phase === "saving"}>
              {phase === "saving" ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        ) : null}
        {phase === "done" ? <p role="status" aria-live="polite">{message}</p> : null}
        {phase === "invalid" ? <Link href="/recuperar-clave">Solicitar otro enlace</Link> : null}
        {phase === "done" ? <Link href="/">Volver al acceso</Link> : null}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Inspect the page's failure paths.** In particular, a failed `signOut` must never display the password again; a failed RPC must never enable the form. Adjust the implementation only if tests or typecheck show a concrete defect.
- [ ] **Step 5: Run focused tests, `pnpm typecheck` and `pnpm test`.** Expect all to pass. Inspect effect cleanup so async work does not set state after unmount.
- [ ] **Step 6: Review and commit:** `git add src/app/restablecer-clave/page.tsx tests/passwordRecovery.test.mjs`; `git commit -m "feat: complete authorized CRM password recovery"`.

### Task 4: Verification and release gate

**Files:** Modify `scripts/smoke.mjs`, `docs/AUDIT.md`; optionally `src/app/globals.css` only if a visual defect is reproduced.

**Interfaces:** Two public HTTP routes: `/recuperar-clave` and `/restablecer-clave`.

- [ ] **Step 1: Add both route strings to `scripts/smoke.mjs` and add a failing contract test confirming the smoke list contains them.** Run the focused test and expect failure before the edit.
- [ ] **Step 2: Run `pnpm typecheck`, `pnpm test`, `pnpm build`, then start the production build and run `pnpm test:smoke`.** Expect all checks to pass. A 200 response proves route delivery only, not email delivery or a valid recovery link.
- [ ] **Step 3: Inspect both pages at desktop and 390 px mobile, keyboard-only navigation, labels, visible loading/error/success states and no horizontal overflow.** Do not submit a real recovery request; use mocked client behavior or local controlled tests.
- [ ] **Step 4: Add a brief dated entry to `docs/AUDIT.md` stating the branch contains the recovery UI, local checks performed, and that exact redirect allowlisting, real email delivery, account change and end-to-end preview validation remain gated.** No other product-document rewrite.
- [ ] **Step 5: Run `git diff --check`, inspect `git status --short` and staged diff, check for secrets and generated files, then commit only Task 4 files:** `git add scripts/smoke.mjs docs/AUDIT.md`; `git commit -m "test: verify CRM password recovery routes"`.

## Handoff after implementation

Report branch, commits, tests and remaining gate. Do not push, create a PR, alter Auth redirect settings, send recovery email, reset a real password, or merge without the user's separate instruction.
