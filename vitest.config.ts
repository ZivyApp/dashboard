import { defineConfig } from "vitest/config";
import path from "node:path";
import { buildDefines } from "./build/defines";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    css: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  define: buildDefines,
});
