"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const ActivitiesOperationalWorkbench = dynamic(() => import("@/components/ActivitiesOperationalWorkbench"), { ssr: false });
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
      </>
    );
  }

  if (pathname === "/contactos/nuevo") {
    return null;
  }

  return null;
}

