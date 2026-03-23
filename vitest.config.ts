import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  // Unit tests never render components — override postcss to prevent Vite from
  // loading postcss.config.mjs (which requires tailwindcss from node_modules)
  css: {
    postcss: { plugins: [] },
  },
  test: {
    /** Run each test file in an isolated Node.js environment */
    environment: "node",
    globals: true,
    /** Global setup: mocks for next/server, Supabase, etc. */
    setupFiles: ["__tests__/setup.ts"],
    /** Clear mocks between every test for isolation */
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: [
        "app/api/**/*.ts",
        "lib/cors.ts",
        "lib/supabase.ts",
        "proxy.ts",
        "components/room-reservation.tsx",
        "app/admin/page.tsx",
        "app/summary/page.tsx",
        "app/admin/calendar/page.tsx",
      ],
      exclude: ["**/*.d.ts", "**/__mocks__/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
