import type { Metadata } from "next";
import CrmClientBridges from "@/components/CrmClientBridges";
import "./globals.css";
import "./prospecting-polish.css";
import "./prospecting-review-panel.css";
import "./ui-density-sidebar-polish.css";
import "./prospect-detail-layout-simplify.css";
import "./home-commercial-workbench.css";
import "./legacy-view-layout-polish.css";
import "./activities-operational-workbench.css";
import "./activities-workbench-polish.css";
import "./contact-completion-bridge.css";

export const metadata: Metadata = {
  title: "Quindío Exquisito CRM",
  description: "MVP CRM for Quindío Exquisito prospecting and follow-up.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <CrmClientBridges />
      </body>
    </html>
  );
}
