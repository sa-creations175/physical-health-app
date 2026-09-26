import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sacreations.bodyhealth',
  appName: 'Body Health',
  webDir: 'dist',
  ios: {
    // The page itself never scrolls or bounces: only the screen frame's
    // content area does (src/components/AppLayout.tsx), so the header and
    // tab bar stay locked, even when pulling down at the top.
    scrollEnabled: false,
  },
};

export default config;
