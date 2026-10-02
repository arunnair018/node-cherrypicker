import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API = "http://localhost:8086";

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api": { target: API },
      "/socket.io": { target: API, ws: true },
    },
  },
  plugins: [react()],
});
