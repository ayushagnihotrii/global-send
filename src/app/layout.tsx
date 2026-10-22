import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
  description: SITE_CONFIG.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_CONFIG.name,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f5f5f7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans antialiased bg-[#f5f5f7] dark:bg-black text-[#1d1d1f] dark:text-white">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
