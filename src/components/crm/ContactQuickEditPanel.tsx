"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mail, Phone, RotateCcw, Save, UserRound, X } from "lucide-react";
import {
  prepareContactUpdate,
  type ContactEditorPatch,
  type ContactEditorValues,
} from "@/features/crm/contactEditorModel";
import type { Contact } from "@/lib/types";

type ContactQuickEditPanelProps = {
  contact: Contact;
  onClose: () => void;
  onSave: (contactId: string, patch: ContactEditorPatch) => Promise<string | null>;
};

function valuesFromContact(contact: Contact): ContactEditorValues {
  return {
    fullName: contact.full_name || "",
    role: contact.role || "",
    email: contact.email || "",
    phone: contact.phone || "",
    notes: contact.notes || "",
  };
}

export function ContactQuickEditPanel({ contact, onClose, onSave }: ContactQuickEditPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [values, setValues] = useState<ContactEditorValues>(() => valuesFromContact(contact));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    panelHeadingRef.current?.focus();
  }, []);

  function update<K extends keyof ContactEditorValues>(field: K, value: ContactEditorValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = prepareContactUpdate(values);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const error = await onSave(contact.id, result.patch);
      if (error) {
        setMessage(error);
        return;
      }

      setValues({
        fullName: result.patch.full_name,
        role: result.patch.role || "",
        email: result.patch.email || "",
        phone: result.patch.phone || "",
        notes: result.patch.notes || "",
      });
      setMessage("Contacto actualizado.");
    } catch {
      setMessage("No se pudo actualizar el contacto. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section ref={panelRef} className="contact-completion-panel" aria-label="Editar contacto comercial">
      <div className="contact-completion-header">
        <div>
          <p className="panel-kicker">Completar contacto</p>
          <h2 ref={panelHeadingRef} tabIndex={-1}>{contact.full_name || "Contacto comercial"}</h2>
          <span>{contact.company_name || "Cliente actual"}</span>
        </div>
        <button className="btn btn-secondary compact" type="button" onClick={onClose} disabled={saving}>
          <X size={15} />
          Cerrar
        </button>
      </div>

      {message ? <div className="alert alert-info" role="status">{message}</div> : null}

      <form className="contact-completion-form" onSubmit={(event) => void submit(event)}>
        <label className="field-label">
          Nombre contacto
          <input
            className="input"
            value={values.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            disabled={saving}
            required
          />
        </label>

        <label className="field-label">
          Rol operativo
          <input
            className="input"
            value={values.role}
            onChange={(event) => update("role", event.target.value)}
            placeholder="Compras, cocina/chef, administrador, principal..."
            disabled={saving}
          />
        </label>

        <label className="field-label">
          Email
          <div className="input-with-icon">
            <Mail size={16} />
            <input
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="correo@cliente.com"
              disabled={saving}
            />
          </div>
        </label>

        <label className="field-label">
          Teléfono / WhatsApp
          <div className="input-with-icon">
            <Phone size={16} />
            <input value={values.phone} onChange={(event) => update("phone", event.target.value)} disabled={saving} />
          </div>
        </label>

        <label className="field-label contact-completion-notes">
          Notas
          <textarea className="textarea" value={values.notes} onChange={(event) => update("notes", event.target.value)} disabled={saving} />
        </label>

        <aside className="contact-completion-summary">
          <UserRound size={18} />
          <div>
            <strong>{values.fullName || "Contacto pendiente"}</strong>
            <span>{values.email || "Email pendiente"} · {values.role || "Rol pendiente"}</span>
          </div>
        </aside>

        <div className="panel-actions">
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <RotateCcw size={16} className="spin" /> : <Save size={17} />}
            {saving ? "Guardando" : "Guardar contacto"}
          </button>
        </div>
      </form>
    </section>
  );
}
