import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import netlify from "@netlify/vite-plugin";

const isTest = process.env.VITEST === "true";

export default defineConfig({
  plugins: [
    react(),
    isTest
      ? null
      : netlify({
          // This app has no edge functions. Leaving them on boots a Deno server that
          // takes down `vite` when Deno is unavailable.
          edgeFunctions: { enabled: false },
          database: { enabled: false },
          blobs: { enabled: false },
        }),
  ].filter(Boolean),
  server: { port: 5173 },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
