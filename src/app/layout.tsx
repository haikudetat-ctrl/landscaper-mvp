import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "L.O.A.M | Landscaping Operations & Management",
  description: "L.O.A.M (Landscaping Operations & Management) for owner-operator landscaping operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#e9efea] text-zinc-900">{children}</body>
    </html>
  );
}
