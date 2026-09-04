import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.satark.ews',
  appName: 'SATARK',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true   // allow HTTP to localhost backend in dev
  },
  android: {
    backgroundColor: '#161B22',
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
