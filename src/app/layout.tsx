import type { Metadata } from "next";
import AddContactFromDetail from "@/components/AddContactFromDetail";
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
        <AddContactFromDetail />
      </body>
    </html>
  );
}
