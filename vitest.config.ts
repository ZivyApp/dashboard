import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    css: true,
    exclude: ["node_modules", "dist", ".worktrees/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
