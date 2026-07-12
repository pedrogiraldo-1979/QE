import type { Metadata } from "next";
import AddContactFromDetail from "@/components/AddContactFromDetail";
import GlobalTopbarAddAction from "@/components/GlobalTopbarAddAction";
import HomeCommercialWorkbench from "@/components/HomeCommercialWorkbench";
import LegacyViewLayoutPolish from "@/components/LegacyViewLayoutPolish";
import ProspectingRouteBridge from "@/components/ProspectingRouteBridge";
import "./globals.css";
import "./prospecting-polish.css";
import "./prospecting-review-panel.css";
import "./ui-density-sidebar-polish.css";
import "./prospect-detail-layout-simplify.css";
import "./home-commercial-workbench.css";
import "./legacy-view-layout-polish.css";

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
        <LegacyViewLayoutPolish />
        <GlobalTopbarAddAction />
      </body>
    </html>
  );
}
