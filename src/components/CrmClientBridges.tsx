"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const ActivitiesOperationalWorkbench = dynamic(() => import("@/components/ActivitiesOperationalWorkbench"), { ssr: false });
const AddActivityEntryBridge = dynamic(() => import("@/components/AddActivityEntryBridge"), { ssr: false });
const ContactCompletionBridge = dynamic(() => import("@/components/ContactCompletionBridge"), { ssr: false });
const HomeCommercialWorkbench = dynamic(() => import("@/components/HomeCommercialWorkbench"), { ssr: false });
const LegacyViewLayoutPolish = dynamic(() => import("@/components/LegacyViewLayoutPolish"), { ssr: false });

export default function CrmClientBridges() {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <>
        <HomeCommercialWorkbench />
        <ActivitiesOperationalWorkbench />
        <LegacyViewLayoutPolish />
        <ContactCompletionBridge />
      </>
    );
  }

  if (pathname === "/agregar") {
    return (
      <AddActivityEntryBridge />
    );
  }

  if (pathname === "/contactos/nuevo") {
    return null;
  }

  return null;
}
