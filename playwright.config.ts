import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 393, height: 873 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "work/browser-results.json" }]],
});
