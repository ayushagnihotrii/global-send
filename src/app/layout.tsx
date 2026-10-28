import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || `https://${SITE_CONFIG.customDomain}`
  ),
  title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
  description: SITE_CONFIG.description,
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    images: [{ url: '/logo.png', width: 800, height: 800, alt: SITE_CONFIG.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    images: ['/logo.png'],
  },
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
  themeColor: "#f2f2f7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans antialiased bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
