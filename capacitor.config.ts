import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.palermoterritorial.lab',
  appName: 'Palermo Territorial Lab',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#123d49',
    preferredContentMode: 'mobile'
  },
  android: {
    backgroundColor: '#123d49',
    allowMixedContent: false
  }
};

export default config;
