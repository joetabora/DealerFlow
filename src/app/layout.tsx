import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DealerFlow",
  description: "Dealership inventory import and scheduling MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              DealerFlow
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/import" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Import
              </Link>
              <Link
                href="/import/csv"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                CSV &amp; media
              </Link>
              <Link
                href="/inventory"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Inventory
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
