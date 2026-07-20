"use client";

import { useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type CompanyOption = {
  id: string;
  name: string | null;
};

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export default function AddContactFromDetail() {
  const companiesRef = useRef<CompanyOption[]>([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    async function loadCompanies() {
      if (loadingRef.current) return;
      loadingRef.current = true;

      const { data, error } = await supabase.from("companies").select("id,name");

      loadingRef.current = false;
      if (!mounted || error) return;
      companiesRef.current = (data || []) as CompanyOption[];
      updateButton();
    }

    function updateButton() {
      const existing = document.getElementById("qe-add-contact-detail-link") as HTMLAnchorElement | null;
      const detailPanel = document.querySelector(".detail-panel");
      const header = detailPanel?.querySelector(".detail-header");
      const tagRow = detailPanel?.querySelector(".tag-row");
      const title = header?.querySelector("h2")?.textContent || "";
      const isCustomerPanel = Boolean(tagRow?.textContent?.toLowerCase().includes("cliente actual"));

      if (!header || !isCustomerPanel || !title.trim()) {
        existing?.remove();
        return;
      }

      if (!companiesRef.current.length) {
        void loadCompanies();
      }

      const company = companiesRef.current.find((item) => normalizeName(item.name || "") === normalizeName(title));
      const href = company
        ? `/contactos/nuevo?companyId=${encodeURIComponent(company.id)}`
        : `/contactos/nuevo?companyName=${encodeURIComponent(title.trim())}`;

      let link = existing;

      if (!link) {
        link = document.createElement("a");
        link.id = "qe-add-contact-detail-link";
        link.className = "btn btn-primary";
        link.textContent = "+ Agregar contacto";
        link.setAttribute("aria-label", "Agregar contacto a esta empresa");
        link.style.marginTop = "10px";
        header.appendChild(link);
      }

      link.href = href;
    }

    const observer = new MutationObserver(updateButton);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const interval = window.setInterval(() => {
      updateButton();
      if (!companiesRef.current.length) void loadCompanies();
    }, 800);

    updateButton();

    return () => {
      mounted = false;
      observer.disconnect();
      window.clearInterval(interval);
      document.getElementById("qe-add-contact-detail-link")?.remove();
    };
  }, []);

  return null;
}
