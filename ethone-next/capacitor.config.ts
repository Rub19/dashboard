import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.ethone.app",
  appName: "ETHONE",
  webDir: "out",
  server: {
    url: "https://ethone.dev",
    cleartext: true,
    androidScheme: "https",
  },
};

export default config;
