"use client";

import { useEffect } from "react";

const PROSPECT_NAME_ERROR = "column prospects.name does not exist";

export default function LegacyViewLayoutPolish() {
  useEffect(() => {
    const updateViewClasses = () => {
      const activeNavText = document.querySelector(".sidebar-nav .nav-button.active span")?.textContent?.trim() || "";
      const isClientsView = activeNavText === "Clientes";
      document.body.classList.toggle("legacy-clients-view-active", isClientsView);

      document.querySelectorAll<HTMLElement>(".workspace .alert").forEach((alert) => {
        const text = alert.textContent || "";
        if (text.includes(PROSPECT_NAME_ERROR)) {
          alert.style.display = "none";
          alert.setAttribute("aria-hidden", "true");
        }
      });
    };

    updateViewClasses();
    const observer = new MutationObserver(updateViewClasses);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });

    return () => {
      observer.disconnect();
      document.body.classList.remove("legacy-clients-view-active");
    };
  }, []);

  return null;
}
