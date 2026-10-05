import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("nuevo prospecto: apilado móvil limitado al formulario de alta", async () => {
  const page = await readFile(new URL("../src/app/prospectos/nuevo/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/app/ui-density-sidebar-polish.css", import.meta.url), "utf8");
  assert.match(page, /className="crm-grid prospect-create-grid"/);
  assert.match(css, /@media\s*\(max-width:\s*860px\)\s*\{\s*\.crm-shell:has\(\.nav-button\.active\[href="\/prospectos"\]\)\s+\.crm-grid\.prospect-create-grid:not\(\.crm-grid-wide\)\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);\s*\}\s*\}/);
});
