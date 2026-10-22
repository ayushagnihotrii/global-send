export const SITE_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Global Send",
  customDomain: process.env.NEXT_PUBLIC_CUSTOM_DOMAIN || "gsend.in",
  tagline: "Your personal cross-device locker & clipboard.",
  description: "Save questions, code snippets, notes, photos, videos, links, and documents from your phone and access them instantly on any computer with your personal Google Drive storage.",
  maxUploadSizeBytes: 250 * 1024 * 1024, // 250 MB default
  defaultUserStorageLimitBytes: 15 * 1024 * 1024 * 1024, // 15 GB default aligning with Google account
  sessionDurationDays: 7,
  shortSessionDurationHours: 24,
  supportedImageTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/bmp",
  ],
  supportedVideoTypes: [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/ogg",
  ],
  theme: {
    fontSans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontMono: '"SF Mono", "Fira Code", "Courier New", Courier, monospace',
    accentColor: "#0071e3",
  },
};
