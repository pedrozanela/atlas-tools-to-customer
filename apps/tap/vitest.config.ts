import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // server-only throws at import time to keep it out of client bundles;
      // Next.js no-ops it on the server. Vitest doesn't, so route it to a
      // stub during tests.
      "server-only": path.resolve(__dirname, "__tests__/_stubs/server-only.ts"),
    },
  },
});
