import { defineConfig, devices } from '@playwright/test';

// E2E_PORT gives a run its own server (scripts/polish/verify.sh uses one), so a server another
// agent started on the default port is never reused — or shut down mid-run.
const PORT = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // A test that only passes on a retry is flaky: fail the run so it gets fixed, not hidden.
  failOnFlakyTests: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/wanderment/`,
    viewport: { width: 390, height: 844 },
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    // CI builds once and tests that exact build before publishing it.
    command: process.env.E2E_PREBUILT ? 'node e2e/serve.mjs' : 'npm run build:web && node e2e/serve.mjs',
    url: `http://localhost:${PORT}/wanderment/`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI && !process.env.E2E_PORT,
    timeout: 180_000,
  },
});
