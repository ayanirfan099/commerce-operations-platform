import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CommerceOps — E-commerce & Inventory Platform",
  description: "Fictional e-commerce storefront with server-authoritative checkout and inventory.",
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-admin-surface text-admin-ink">
        {children}
      </body>
    </html>
  );
}
