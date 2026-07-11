import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quindío Exquisito CRM",
  description: "MVP CRM for Quindío Exquisito prospecting and follow-up.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <a
          href="/contactos/nuevo"
          aria-label="Agregar contacto"
          style={{
            position: "fixed",
            right: "18px",
            bottom: "18px",
            zIndex: 30,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "42px",
            borderRadius: "8px",
            background: "var(--primary)",
            color: "#fff",
            boxShadow: "0 18px 44px rgba(25, 35, 29, 0.18)",
            fontWeight: 900,
            padding: "0 14px",
          }}
        >
          + Agregar contacto
        </a>
      </body>
    </html>
  );
}
