import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.ethone.app",
  appName: "ETHONE",
  webDir: "out",
  server: {
    url: "https://ethone.dev",
    cleartext: true,
    androidScheme: "https",
    iosScheme: "ethone",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#00000000",
      overlaysWebView: true,
    },
    PushNotifications: {
      presentationOptions: ["alert", "badge", "sound"],
    },
    Badge: {
      persist: true,
      autoClear: false,
    },
    BiometricAuth: {
      reason: "Authentifiez-vous pour accéder à vos données ETHONE.",
      cancelTitle: "Annuler",
      allowDeviceCredential: true,
    },
  },
};

export default config;
