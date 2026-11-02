import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "setup/ui",
  plugins: [react()],
  clearScreen: false,
  server: { port: 5191, strictPort: true, fs: { allow: ["../.."] } },
  build: { target: "es2022", outDir: "dist", emptyOutDir: true },
});
