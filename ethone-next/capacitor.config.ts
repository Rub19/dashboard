import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.ethone.app",
  appName: "ETHONE",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
