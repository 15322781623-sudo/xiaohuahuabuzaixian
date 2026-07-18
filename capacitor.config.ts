import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xyzw.webhelper',
  appName: 'xyzw_web_helper',
  webDir: 'dist',
  server: {
    hostname: 'localhost',
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
