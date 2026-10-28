export const EXPIRATION_PRESETS = [
  { label: '1 hour', shortLabel: '1h', seconds: 3600 },
  { label: '6 hours', shortLabel: '6h', seconds: 21600 },
  { label: '12 hours', shortLabel: '12h', seconds: 43200 },
  { label: '24 hours', shortLabel: '24h', seconds: 86400 },
  { label: '3 days', shortLabel: '3d', seconds: 259200 },
  { label: '7 days', shortLabel: '7d', seconds: 604800 },
] as const;

export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'system',
  'support',
  'help',
  'globalsend',
  'global_send',
  'global.send',
  'quickvault',
  'api',
  'auth',
  'login',
  'register',
  'logout',
  'settings',
  'profile',
  'vault',
  'chat',
  'chats',
  'messages',
  'null',
  'undefined',
  'owner',
  'security',
  'moderator',
  'bot',
  'me',
  'user',
  'users',
  'public',
  'private',
  'deleted',
  'anonymous',
]);

export const PRESET_SECURITY_QUESTIONS = [
  'What was the name of your first childhood imaginary friend or first pet?',
  'What was the street name of the first residence you remember living at?',
  'What was the title of the first movie or play you saw in a theater?',
  'In what city or town did your parents or guardians first meet?',
  'What was the model of your very first computer, phone, or gaming console?',
  'What was the first music concert or live show you attended?',
  'What was the surname of your favorite teacher who inspired you most?',
  'What was the nickname your childhood friends or family called you?',
] as const;

export const SITE_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'Global Send',
  customDomain: process.env.NEXT_PUBLIC_CUSTOM_DOMAIN || 'gsend.in',
  tagline: 'Private temporary cloud vault & encrypted messenger.',
  description:
    'Save files, notes, questions, and links with automatic expiration, and share items privately with other Global Send users.',
  maxUploadSizeBytes: Number(process.env.MAX_UPLOAD_SIZE_BYTES) || 250 * 1024 * 1024, // 250 MiB default per file
  maxAvatarSizeBytes: 100 * 1024, // Strict 100 KiB (102,400 bytes) maximum for profile pictures
  allowedAvatarMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  defaultUserStorageLimitBytes:
    Number(process.env.USER_STORAGE_LIMIT_BYTES) || 2 * 1024 * 1024 * 1024, // 2 GiB per user default
  globalStorageLimitBytes:
    Number(process.env.GLOBAL_STORAGE_LIMIT_BYTES) || 15 * 1024 * 1024 * 1024, // 15 GiB shared Google Drive pool
  storageSafetyReserveBytes:
    Number(process.env.STORAGE_SAFETY_RESERVE_BYTES) || 256 * 1024 * 1024, // 256 MiB safety buffer
  defaultExpirationSeconds: 86400, // 24 hours default
  minExpirationSeconds: 60, // 1 minute minimum
  maxExpirationSeconds: 30 * 24 * 3600, // 30 days maximum
  uploadSessionTimeoutSeconds: 2 * 3600, // 2 hours for incomplete uploads before cleanup
  sessionDurationDays: 7,
  shortSessionDurationHours: 24,
  supportedImageTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
  ],
  supportedVideoTypes: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/ogg',
  ],
  theme: {
    fontSans:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontMono: '"SF Mono", "Fira Code", "Courier New", Courier, monospace',
    accentColor: '#0071e3',
  },
};
