import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Sales CRM by Karalisweb",
  description: "CRM per il supporto commerciale - Karalisweb v. 2.0",
  applicationName: "Sales CRM by Karalisweb",
  authors: [{ name: "Karalisweb" }],
  generator: "Next.js",
  keywords: ["CRM", "Sales", "Lead Management", "Karalisweb"],
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
