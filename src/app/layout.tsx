import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE_CONFIG } from "@/config/site";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const productionDomain = `https://${SITE_CONFIG.customDomain}`;
const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
const metadataBaseUrl =
  process.env.NODE_ENV === 'production'
    ? (configuredUrl && !configuredUrl.includes('localhost') ? configuredUrl : productionDomain)
    : (configuredUrl || productionDomain);

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
  description: SITE_CONFIG.description,
  applicationName: SITE_CONFIG.name,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/logo.png', sizes: '847x850', type: 'image/png' },
    ],
    shortcut: '/icon-192.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
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
    statusBarStyle: "black-translucent",
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
          <ToastProvider>
            <ServiceWorkerRegister />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
