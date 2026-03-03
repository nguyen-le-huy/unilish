import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      usePolling: true, // Required for Docker hot-reload on some OS
      interval: 200,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
      overlay: true,
    },
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})
