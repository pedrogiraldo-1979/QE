import type { ReactNode } from "react";
import Link from "next/link";

export default function ProspectosLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Link
        href="/prospectos/limpieza"
        aria-label="Ir a limpieza de prospectos"
        style={{
          position: "fixed",
          right: "18px",
          bottom: "78px",
          zIndex: 40,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40px",
          borderRadius: "999px",
          background: "#fff",
          border: "1px solid var(--border)",
          color: "var(--text)",
          boxShadow: "0 14px 34px rgba(25, 35, 29, 0.14)",
          fontWeight: 900,
          padding: "0 14px",
          textDecoration: "none",
        }}
      >
        Limpieza
      </Link>
    </>
  );
}
