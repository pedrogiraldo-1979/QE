const baseUrl = (process.env.CRM_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const routes = [
  "/",
  "/actualizar-datos",
  "/actualizar-datos?token=qe-test-formulario-2026",
  "/agregar",
  "/contactos/nuevo",
  "/prospectos",
  "/prospectos/limpieza",
  "/prospectos/nuevo",
  "/piloto-campana",
  "/prueba-correo",
];

async function request(pathname, expectedStatus) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.text();

  if (response.status !== expectedStatus) {
    throw new Error(`${pathname}: HTTP ${response.status}; se esperaba ${expectedStatus}`);
  }

  if (expectedStatus === 200) {
    if (!/<html[^>]+lang=["']es["']/i.test(body)) {
      throw new Error(`${pathname}: el documento no declara lang=\"es\"`);
    }
    if (!/<body[\s>]/i.test(body)) {
      throw new Error(`${pathname}: la respuesta no contiene un documento HTML completo`);
    }
  }
}

const checks = [
  ...routes.map((pathname) => [pathname, 200]),
  ["/ruta-inexistente-fase-6", 404],
];

let failures = 0;

for (const [pathname, expectedStatus] of checks) {
  try {
    await request(pathname, expectedStatus);
    console.log(`OK ${expectedStatus} ${pathname}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${pathname}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures > 0) {
  console.error(`Smoke fallido: ${failures}/${checks.length} verificaciones.`);
  process.exitCode = 1;
} else {
  console.log(`Smoke aprobado: ${checks.length}/${checks.length} verificaciones.`);
}
