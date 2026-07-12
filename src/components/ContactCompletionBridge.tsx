"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Edit3, Mail, Phone, RotateCcw, Save, UserRound, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type EditableContact = {
  id: string;
  company_id: string | null;
  company_name: string | null;
  full_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

type ContactForm = {
  fullName: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyForm: ContactForm = {
  fullName: "",
  role: "",
  email: "",
  phone: "",
  notes: "",
};

export default function ContactCompletionBridge() {
  const supabase = getSupabaseClient();
  const [activePage, setActivePage] = useState(false);
  const [workspace, setWorkspace] = useState<Element | null>(null);
  const [contacts, setContacts] = useState<EditableContact[]>([]);
  const contactsRef = useRef<EditableContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<EditableContact | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    const updateActiveState = () => {
      const pageWorkspace = document.querySelector(".workspace");
      const activeNavText = document.querySelector(".sidebar-nav .nav-button.active span")?.textContent?.trim() || "";
      const pageTitle = document.querySelector(".workspace .topbar h1")?.textContent?.trim() || "";
      const shouldShow =
        window.location.pathname === "/" &&
        Boolean(pageWorkspace) &&
        (normalizeText(activeNavText).includes("contactos") || normalizeText(pageTitle).includes("directorio comercial"));

      setWorkspace(pageWorkspace);
      setActivePage(shouldShow);
    };

    updateActiveState();
    const observer = new MutationObserver(updateActiveState);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("popstate", updateActiveState);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", updateActiveState);
    };
  }, []);

  useEffect(() => {
    if (!activePage) return;
    void loadContacts();
  }, [activePage]);

  useEffect(() => {
    if (!activePage) return;

    const handleContactEditClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button) return;

      const isBridgeButton = button.classList.contains("contact-quick-edit-action");
      const label = normalizeText(button.textContent || "");
      if (!isBridgeButton && !label.includes("completar datos") && !label.includes("editar contacto")) return;

      const row = button.closest("tr");
      if (!row) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const contact = findContactFromRow(row, contactsRef.current);
      if (!contact) {
        setMessage("No pude identificar ese contacto. Prueba refrescar y volver a abrir Contactos.");
        return;
      }

      openContact(contact);
    };

    document.addEventListener("click", handleContactEditClick, true);
    return () => document.removeEventListener("click", handleContactEditClick, true);
  }, [activePage]);

  useEffect(() => {
    if (!activePage) return;

    const decorateRows = () => decorateContactRows(contactsRef.current);
    decorateRows();
    const observer = new MutationObserver(decorateRows);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [activePage, contacts]);

  async function loadContacts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("id,company_id,company_name,full_name,role,email,phone,notes")
      .order("company_name", { ascending: true });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setContacts((data || []) as EditableContact[]);
    setLoading(false);
  }

  function openContact(contact: EditableContact) {
    setSelectedContact(contact);
    setForm({
      fullName: contact.full_name || "",
      role: contact.role || "",
      email: contact.email || "",
      phone: contact.phone || "",
      notes: contact.notes || "",
    });
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact) return;

    const fullName = cleanText(form.fullName);
    const role = cleanText(form.role);
    const email = cleanEmail(form.email);
    const phone = cleanText(form.phone);
    const notes = form.notes.trim();

    if (!fullName) {
      setMessage("El contacto necesita nombre.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("contacts")
      .update({
        full_name: fullName,
        role: role || null,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedContact.id)
      .select("id,company_id,company_name,full_name,role,email,phone,notes")
      .single();

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    const updated = data as EditableContact;
    setContacts((current) => current.map((contact) => (contact.id === updated.id ? updated : contact)));
    setSelectedContact(updated);
    setForm({
      fullName: updated.full_name || "",
      role: updated.role || "",
      email: updated.email || "",
      phone: updated.phone || "",
      notes: updated.notes || "",
    });
    setMessage("Contacto actualizado. Refrescando directorio...");
    setSaving(false);
    refreshCurrentView();
  }

  if (!activePage || !workspace) return null;

  return createPortal(
    <>
      {message && !selectedContact ? <div className="contact-completion-inline-message alert alert-info">{message}</div> : null}
      {selectedContact ? (
        <section className="contact-completion-panel" aria-label="Editar contacto comercial">
          <div className="contact-completion-header">
            <div>
              <p className="panel-kicker">Completar contacto</p>
              <h2>{selectedContact.full_name || "Contacto comercial"}</h2>
              <span>{selectedContact.company_name || "Cliente actual"}</span>
            </div>
            <button className="btn btn-secondary compact" type="button" onClick={() => setSelectedContact(null)} disabled={saving}>
              <X size={15} />
              Cerrar
            </button>
          </div>

          {message ? <div className="alert alert-info">{message}</div> : null}

          <form className="contact-completion-form" onSubmit={handleSubmit}>
            <label className="field-label">
              Nombre contacto
              <input className="input" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} disabled={saving} required />
            </label>

            <label className="field-label">
              Rol operativo
              <input className="input" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} placeholder="Compras, cocina/chef, administrador, principal..." disabled={saving} />
            </label>

            <label className="field-label">
              Email
              <div className="input-with-icon">
                <Mail size={16} />
                <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="correo@cliente.com" disabled={saving} />
              </div>
            </label>

            <label className="field-label">
              Teléfono / WhatsApp
              <div className="input-with-icon">
                <Phone size={16} />
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} disabled={saving} />
              </div>
            </label>

            <label className="field-label contact-completion-notes">
              Notas
              <textarea className="textarea" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} disabled={saving} />
            </label>

            <aside className="contact-completion-summary">
              <UserRound size={18} />
              <div>
                <strong>{form.fullName || "Contacto pendiente"}</strong>
                <span>{form.email || "Email pendiente"} · {form.role || "Rol pendiente"}</span>
              </div>
            </aside>

            <div className="panel-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setSelectedContact(null)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" type="submit" disabled={saving || loading}>
                {saving ? <RotateCcw size={16} className="spin" /> : <Save size={17} />}
                {saving ? "Guardando" : "Guardar contacto"}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>,
    workspace
  );
}

function decorateContactRows(contacts: EditableContact[]) {
  const pageTitle = normalizeText(document.querySelector(".workspace .topbar h1")?.textContent || "");
  if (!pageTitle.includes("directorio comercial")) return;

  const rows = Array.from(document.querySelectorAll(".workspace .list-panel table tbody tr"));

  for (const row of rows) {
    if (row.querySelector(".contact-quick-edit-action")) continue;
    const contact = findContactFromRow(row, contacts);
    if (!contact) continue;

    const lastCell = row.querySelector("td:last-child");
    if (!lastCell) continue;

    let actions = lastCell.querySelector(".row-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "row-actions";
      lastCell.appendChild(actions);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-primary compact contact-quick-edit-action";
    button.innerHTML = `<span class="contact-quick-edit-icon">✎</span> Editar rápido`;
    actions.appendChild(button);
  }
}

function findContactFromRow(row: Element, contacts: EditableContact[]) {
  const cells = Array.from(row.querySelectorAll("td"));
  const name = normalizeText(cells[0]?.querySelector("strong")?.textContent || "");
  const phone = normalizePhone(cells[0]?.querySelector("span")?.textContent || "");
  const company = normalizeText(cells[1]?.textContent || "");

  return (
    contacts.find((contact) => {
      const contactName = normalizeText(contact.full_name || "");
      const contactPhone = normalizePhone(contact.phone || "");
      const contactCompany = normalizeText(contact.company_name || "");

      const nameMatches = Boolean(name) && contactName === name;
      const phoneMatches = Boolean(phone) && contactPhone === phone;
      const companyMatches = !company || contactCompany === company || contactCompany.includes(company) || company.includes(contactCompany);

      return nameMatches && companyMatches && (!phone || phoneMatches || !contactPhone);
    }) ||
    contacts.find((contact) => {
      const contactName = normalizeText(contact.full_name || "");
      const contactCompany = normalizeText(contact.company_name || "");
      return Boolean(name) && contactName === name && Boolean(company) && contactCompany.includes(company);
    }) ||
    null
  );
}

function refreshCurrentView() {
  window.setTimeout(() => {
    const refreshButton = Array.from(document.querySelectorAll(".topbar-actions button")).find((button) =>
      normalizeText(button.textContent || "").includes("refrescar")
    ) as HTMLButtonElement | undefined;

    refreshButton?.click();
  }, 350);
}

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanEmail(value: string) {
  return cleanText(value).toLowerCase();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}
