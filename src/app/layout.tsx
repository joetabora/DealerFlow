import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/components/app/bottom-nav";
import { Sidebar } from "@/components/app/sidebar";
import { ToastProvider } from "@/components/ui/toast";
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
  description: "Dealership inventory and social media scheduling",
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
      <body className="min-h-full bg-gray-50 text-gray-900">
        <ToastProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:ml-[240px] md:pb-0">
              {children}
            </div>
            <BottomNav />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
