import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | CommerceOps",
    default: "CommerceOps — E-commerce & Inventory Platform",
  },
  description:
    "Fictional e-commerce storefront with server-authoritative checkout, inventory ledger, and operations dashboard.",
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  openGraph: {
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CommerceOps — E-commerce & Inventory Platform social preview",
      },
    ],
    siteName: "CommerceOps",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-admin-surface text-admin-ink">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-admin-ink focus:ring-2 focus:ring-admin-accent focus:rounded"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
