import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Le copie di lavoro sotto .claude/worktrees/ contengono un duplicato di
    // ogni test: senza questa esclusione ogni esecuzione conta il doppio.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.claude/**'],
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
