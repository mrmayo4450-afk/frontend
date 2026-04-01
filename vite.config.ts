import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      proxy: apiUrl
        ? {}
        : {
            "/api": { target: "http://localhost:5000", changeOrigin: true },
            "/uploads": { target: "http://localhost:5000", changeOrigin: true },
          },
      fs: {
        strict: false,
        deny: ["**/.*"],
      },
    },
  };
});
