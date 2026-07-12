"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function GlobalTopbarAddAction() {
  const [container, setContainer] = useState<Element | null>(null);

  useEffect(() => {
    const updateContainer = () => {
      setContainer(document.querySelector(".topbar-actions"));
    };

    updateContainer();
    const observer = new MutationObserver(updateContainer);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!container) return null;

  return createPortal(
    <Link className="btn btn-primary global-topbar-add-action" href="/agregar" aria-label="Agregar cliente o contacto">
      <Plus size={17} />
      Agregar
    </Link>,
    container
  );
}
