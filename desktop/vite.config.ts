import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5190,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/target/**", "**/setup/target/**"] },
  },
  build: { target: "es2022" },
});
