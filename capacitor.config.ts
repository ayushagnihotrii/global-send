import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.gsend.app',
  appName: 'Global Send',
  webDir: 'public',
  server: {
    url: 'https://global-send-v2.vercel.app',
    cleartext: true,
  },
  android: {
    backgroundColor: '#121215',
    allowMixedContent: true,
  },
  plugins: {
    StatusBar: {
      backgroundColor: '#121215',
      style: 'DARK',
    },
  },
};

export default config;
