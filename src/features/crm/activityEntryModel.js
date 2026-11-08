export function normalizeActivitySearch(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

export function normalizeActivityNotes(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function buildActivityTargets(companies, prospects) {
  const customerTargets = companies.map((company) => ({
    key: `cliente:${company.id}`,
    id: company.id,
    name: company.name || "Cliente sin nombre",
    segment: company.segment,
    source: "cliente",
  }));

  const prospectTargets = prospects.map((prospect) => ({
    key: `prospecto:${prospect.id}`,
    id: prospect.id,
    name: prospect.company_name || "Prospecto sin nombre",
    segment: prospect.segment,
    source: "prospecto",
  }));

  return [...customerTargets, ...prospectTargets];
}

export function filterActivityTargets(targets, targetSearch) {
  const query = normalizeActivitySearch(targetSearch);
  const terms = query.split(" ").filter(Boolean);

  if (!terms.length) return targets.slice(0, 8);

  return targets
    .map((target) => {
      const name = normalizeActivitySearch(target.name || "");
      const segment = normalizeActivitySearch(target.segment || "");
      const source = normalizeActivitySearch(target.source);
      const searchable = `${name} ${segment} ${source}`.trim();
      let score = target.source === "cliente" ? 1 : 0;

      for (const term of terms) {
        if (!searchable.includes(term)) return null;
        if (name === query) score += 16;
        if (name.startsWith(term)) score += 8;
        if (name.includes(` ${term}`)) score += 5;
        if (name.includes(term)) score += 3;
        if (segment.includes(term)) score += 1;
        if (source.includes(term)) score += 1;
      }

      return { target, score };
    })
    .filter((item) => item !== null)
    .sort((a, b) => b.score - a.score || a.target.name.localeCompare(b.target.name, "es"))
    .slice(0, 8)
    .map((item) => item.target);
}

export function validateActivityEntry(selectedTarget, notes) {
  if (!selectedTarget) return "Selecciona un cliente o prospecto desde los resultados de búsqueda.";
  if (!normalizeActivityNotes(notes)) return "Agrega una nota breve para la actividad.";
  return null;
}

export function buildActivityInsert(target, fields) {
  const sharedActivityFields = {
    activity_type: fields.activityType,
    notes: normalizeActivityNotes(fields.notes),
    due_date: fields.dueDate || null,
    completed: false,
  };

  return target.source === "prospecto"
    ? { table: "prospect_activities", payload: { prospect_id: target.id, ...sharedActivityFields } }
    : { table: "activities", payload: { company_id: target.id, ...sharedActivityFields } };
}

