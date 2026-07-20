"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const ActivitiesOperationalWorkbench = dynamic(() => import("@/components/ActivitiesOperationalWorkbench"), { ssr: false });
const AddActivityEntryBridge = dynamic(() => import("@/components/AddActivityEntryBridge"), { ssr: false });
const AddContactFromDetail = dynamic(() => import("@/components/AddContactFromDetail"), { ssr: false });
const ContactCompletionBridge = dynamic(() => import("@/components/ContactCompletionBridge"), { ssr: false });
const GlobalTopbarAddAction = dynamic(() => import("@/components/GlobalTopbarAddAction"), { ssr: false });
const HomeCommercialWorkbench = dynamic(() => import("@/components/HomeCommercialWorkbench"), { ssr: false });
const LegacyViewLayoutPolish = dynamic(() => import("@/components/LegacyViewLayoutPolish"), { ssr: false });
const ProspectingRouteBridge = dynamic(() => import("@/components/ProspectingRouteBridge"), { ssr: false });

export default function CrmClientBridges() {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <>
        <AddContactFromDetail />
        <ProspectingRouteBridge />
        <HomeCommercialWorkbench />
        <ActivitiesOperationalWorkbench />
        <LegacyViewLayoutPolish />
        <ContactCompletionBridge />
        <GlobalTopbarAddAction />
      </>
    );
  }

  if (pathname === "/agregar") {
    return (
      <>
        <AddActivityEntryBridge />
        <GlobalTopbarAddAction />
      </>
    );
  }

  if (pathname === "/contactos/nuevo") {
    return <GlobalTopbarAddAction />;
  }

  return null;
}
