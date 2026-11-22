import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parkit.app',
  appName: 'PARKIT',
  webDir: 'dist',
  backgroundColor: '#D9E6F2',
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
