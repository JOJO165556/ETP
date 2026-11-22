import { defineConfig, devices } from "@playwright/test";

/*
 * Tests de bout en bout du parcours de recrutement.
 * Prérequis : backend FastAPI (:8000) et frontend Next.js (:3000) démarrés
 * automatiquement par webServer. La base doit être migrée.
 * OTP : le code universel "123456" est accepté tant que RESEND_API_KEY
 * n'est pas configuré (environnement de test).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 300_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "../.venv/bin/uvicorn src.main:app --host 127.0.0.1 --port 8000",
      cwd: "..",
      url: "http://127.0.0.1:8000/health/ready",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
