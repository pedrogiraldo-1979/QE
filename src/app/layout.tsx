import type { Metadata } from "next";
import AddContactFromDetail from "@/components/AddContactFromDetail";
import HomeCommercialWorkbench from "@/components/HomeCommercialWorkbench";
import ProspectingRouteBridge from "@/components/ProspectingRouteBridge";
import "./globals.css";
import "./prospecting-polish.css";
import "./prospecting-review-panel.css";
import "./ui-density-sidebar-polish.css";
import "./prospect-detail-layout-simplify.css";
import "./home-commercial-workbench.css";

export const metadata: Metadata = {
  title: "Quindío Exquisito CRM",
  description: "MVP CRM for Quindío Exquisito prospecting and follow-up.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <AddContactFromDetail />
        <ProspectingRouteBridge />
        <HomeCommercialWorkbench />
        <a
          className="global-add-button"
          href="/agregar"
          aria-label="Agregar cliente o contacto"
          style={{
            position: "fixed",
            right: "18px",
            bottom: "18px",
            zIndex: 30,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "42px",
            borderRadius: "999px",
            background: "var(--primary)",
            color: "#fff",
            boxShadow: "0 18px 44px rgba(25, 35, 29, 0.18)",
            fontWeight: 900,
            padding: "0 16px",
          }}
        >
          + Agregar
        </a>
      </body>
    </html>
  );
}
