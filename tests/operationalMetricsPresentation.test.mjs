import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");
const componentPath = "src/components/crm/OperationalMetricCards.tsx";
const require = createRequire(import.meta.url);

async function render(state) {
  const source = await read(componentPath);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require });
  return renderToStaticMarkup(React.createElement(exports.OperationalMetricCards, { state }));
}

const ready = (coverage, overdue) => ({ status: "ready", metrics: { coverage, overdue } });
const zeroCoverage = { status: "available", numerator: 0, denominator: 2, percentage: 0 };
const zeroOverdue = { status: "available", count: 0 };

test("tarjetas muestran carga, no un cero provisional", async () => {
  for (const status of ["idle", "loading"]) {
    const html = await render({ status });
    assert.equal((html.match(/Cargando/g) ?? []).length, 2);
    assert.doesNotMatch(html, /<strong>0<\/strong>/);
    assert.match(html, /aria-busy="true"/);
  }
});

test("tarjeta de cobertura muestra cantidad, base y porcentaje", async () => {
  const html = await render(ready({ status: "available", numerator: 1, denominator: 4, percentage: 25 }, zeroOverdue));
  assert.match(html, /25\s?%/);
  assert.match(html, /1 de 4 empresas/);
  assert.match(html, /Colombia/);
  assert.match(html, /no es una instantánea transaccional/);
});

test("tarjetas distinguen sin base de cero real", async () => {
  assert.match(await render(ready({ status: "available", numerator: 0, denominator: 0, percentage: null }, zeroOverdue)), /Sin base/);
  const html = await render(ready(zeroCoverage, zeroOverdue));
  assert.match(html, /0\s?%/);
  assert.match(html, /<strong>0<\/strong>/);
});

test("tarjetas muestran indisponibilidad independiente y sin datos personales", async () => {
  const html = await render(ready(zeroCoverage, { status: "unavailable", reason: "source-error" }));
  assert.equal((html.match(/No disponible/g) ?? []).length, 1);
  assert.doesNotMatch(html, /source-error|email|company_id|token/);
  assert.match(html, /Refresca/);
});

test("Inicio habilita métricas sólo con sesión lista y su vista; refresco es independiente", async () => {
  const page = await read("src/app/page.tsx");
  assert.match(page, /useOperationalMetrics\(supabase, sessionReady && isAuthenticated && viewMode === "home"\)/);
  assert.match(page, /<OperationalMetricCards state=\{operationalMetrics.state\}/);
  assert.match(page, /void loadData\(\);\s*void operationalMetrics.refresh\(\)/);
  assert.doesNotMatch(page, /label="Seguimientos vencidos" value=\{overdueActivities \+ overdueProspectActivities\}/);
});

test("hook cancela cargas, invalida por Auth y oculta métricas deshabilitadas", async () => {
  const hook = await read("src/hooks/useOperationalMetrics.ts");
  assert.match(hook, /onAuthStateChange/);
  assert.match(hook, /subscription.unsubscribe\(\)/);
  assert.match(hook, /loader.clear\(\)/);
  assert.match(hook, /state: enabled \? state : IDLE/);
  assert.doesNotMatch(hook, /console\.|localStorage|sessionStorage/);
});
