import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoMina 360 | All-In-One Enterprise Command Center",
  description:
    "Enterprise management and decision-support operating system for a Ghana-based business owner. Securely manage Poultry, Block Factory, Aquaculture, Livestock, Restaurant, Electronic Shop, and Car Wash from one centralized HQ.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
