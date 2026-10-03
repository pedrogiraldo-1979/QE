export type ContactEditorValues = {
  fullName: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
};

export type ContactEditorPatch = {
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export type ContactEditorResult =
  | { ok: true; patch: ContactEditorPatch }
  | { ok: false; message: "El contacto necesita nombre." };

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanEmail(value: string) {
  return cleanText(value).toLowerCase();
}

export function prepareContactUpdate(values: ContactEditorValues): ContactEditorResult {
  const fullName = cleanText(values.fullName);
  if (!fullName) return { ok: false, message: "El contacto necesita nombre." };

  const role = cleanText(values.role);
  const email = cleanEmail(values.email);
  const phone = cleanText(values.phone);
  const notes = values.notes.trim();

  return {
    ok: true,
    patch: {
      full_name: fullName,
      role: role || null,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
    },
  };
}
