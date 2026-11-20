import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
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
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
