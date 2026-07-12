"use client";

import { useEffect } from "react";

function isProspectingTrigger(element: Element | null) {
  if (!element) return false;
  const button = element.closest("button.nav-button, button.action-card");
  if (!button) return false;
  return button.textContent?.toLowerCase().includes("prospección") || false;
}

export default function ProspectingRouteBridge() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!isProspectingTrigger(target)) return;

      event.preventDefault();
      window.location.assign("/prospectos");
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
