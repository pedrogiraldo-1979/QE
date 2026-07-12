export type ProspectQualityContact = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
};

export type ProspectQualityProspect = {
  company_name?: string | null;
  name?: string | null;
  legal_name?: string | null;
  nit?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type ProspectQualityCompany = {
  id?: string | null;
  name?: string | null;
  legal_name?: string | null;
  nit?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: string | null;
};

export type DuplicateSignal = "nit" | "phone" | "name" | "address";

export type CompanyDuplicateMatch = {
  company: ProspectQualityCompany;
  signals: DuplicateSignal[];
};

export type ContactValidation = {
  crmValid: boolean;
  campaignValid: boolean;
  missing: string[];
};

export type ConversionReadinessItem = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

export function getProspectDisplayName(prospect: ProspectQualityProspect) {
  return prospect.company_name || prospect.name || prospect.legal_name || "Prospecto sin nombre";
}

export function validateProspectContact(contact: ProspectQualityContact): ContactValidation {
  const hasName = Boolean(contact.full_name?.trim());
  const hasChannel = Boolean(contact.email?.trim() || contact.phone?.trim());
  const hasValidEmail = isValidEmail(contact.email);
  const missing: string[] = [];

  if (!hasName) missing.push("nombre");
  if (!hasChannel) missing.push("email o teléfono");
  if (contact.email && !hasValidEmail) missing.push("email válido");

  return {
    crmValid: hasName && hasChannel,
    campaignValid: hasName && hasValidEmail,
    missing,
  };
}

export function findPossibleCompanyMatches(
  prospect: ProspectQualityProspect,
  companies: ProspectQualityCompany[],
  maxMatches = 5
): CompanyDuplicateMatch[] {
  return companies
    .map((company) => ({ company, signals: getDuplicateSignals(prospect, company) }))
    .filter((match) => match.signals.length > 0)
    .sort((a, b) => b.signals.length - a.signals.length)
    .slice(0, maxMatches);
}

export function getConversionReadiness(
  prospect: ProspectQualityProspect,
  contacts: ProspectQualityContact[],
  duplicateMatches: CompanyDuplicateMatch[]
): ConversionReadinessItem[] {
  const contactsWithCrmValue = contacts.filter((contact) => validateProspectContact(contact).crmValid);
  const contactsWithCampaignValue = contacts.filter((contact) => validateProspectContact(contact).campaignValid);

  return [
    {
      key: "company_name",
      label: "Nombre de empresa",
      ok: Boolean(getProspectDisplayName(prospect).trim()),
      detail: "Necesario para crear o comparar cliente CRM.",
    },
    {
      key: "duplicate_check",
      label: "Revisión contra clientes actuales",
      ok: duplicateMatches.length === 0,
      detail: duplicateMatches.length ? "Hay posibles coincidencias que deben revisarse." : "Sin coincidencias evidentes.",
    },
    {
      key: "contact_crm",
      label: "Contacto útil para CRM",
      ok: contactsWithCrmValue.length > 0,
      detail: contactsWithCrmValue.length ? `${contactsWithCrmValue.length} contacto(s) con nombre y canal.` : "Falta un contacto con nombre y email o teléfono.",
    },
    {
      key: "campaign_ready",
      label: "Contacto apto para campaña futura",
      ok: contactsWithCampaignValue.length > 0,
      detail: contactsWithCampaignValue.length ? `${contactsWithCampaignValue.length} email(s) válidos.` : "No exportar todavía a campañas.",
    },
  ];
}

export function isValidEmail(email?: string | null) {
  if (!email?.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getDuplicateSignals(prospect: ProspectQualityProspect, company: ProspectQualityCompany): DuplicateSignal[] {
  const signals: DuplicateSignal[] = [];
  const prospectNit = normalizeIdentifier(prospect.nit);
  const companyNit = normalizeIdentifier(company.nit);
  const prospectPhone = normalizePhone(prospect.phone);
  const companyPhone = normalizePhone(company.phone);
  const prospectName = normalizeText(getProspectDisplayName(prospect));
  const companyName = normalizeText(company.name || company.legal_name || "");
  const prospectAddress = normalizeText(prospect.address || "");
  const companyAddress = normalizeText(company.address || "");

  if (prospectNit && companyNit && prospectNit === companyNit) signals.push("nit");
  if (prospectPhone && companyPhone && hasPhoneOverlap(prospectPhone, companyPhone)) signals.push("phone");
  if (prospectName && companyName && hasMeaningfulTextOverlap(prospectName, companyName)) signals.push("name");
  if (prospectAddress && companyAddress && hasMeaningfulTextOverlap(prospectAddress, companyAddress)) signals.push("address");

  return signals;
}

function normalizeIdentifier(value?: string | null) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizePhone(value?: string | null) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length >= 7 ? digits : "";
}

function hasPhoneOverlap(a: string, b: string) {
  const aTail = a.slice(-7);
  const bTail = b.slice(-7);
  return Boolean(aTail && bTail && aTail === bTail);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasMeaningfulTextOverlap(a: string, b: string) {
  if (a.length < 6 || b.length < 6) return false;
  if (a.includes(b) || b.includes(a)) return true;

  const aWords = new Set(a.split(" ").filter((word) => word.length >= 4));
  const bWords = new Set(b.split(" ").filter((word) => word.length >= 4));
  const sharedWords = [...aWords].filter((word) => bWords.has(word));

  return sharedWords.length >= 2;
}
