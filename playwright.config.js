const { defineConfig, devices } = require('@playwright/test');

const port = Number(process.env.TEST_SERVER_PORT || 4173);
const host = process.env.TEST_SERVER_HOST || process.env.HOST || 'localhost';
const baseURL = `http://${host}:${port}`;
const siteRoot = process.env.TEST_SITE_ROOT || '.';

const mobileViewport = { width: 375, height: 667 };
const mobileUse = {
  baseURL,
  viewport: mobileViewport,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['iPhone SE'].userAgent,
  trace: 'retain-on-failure'
};

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  reporter: 'list',
  webServer: {
    command: `node scripts/serve-static.js ${siteRoot} ${port}`,
    url: `${baseURL}/index.html`,
    reuseExistingServer: true,
    timeout: 30000
  },
  projects: [
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: {
        baseURL,
        channel: 'msedge',
        trace: 'retain-on-failure'
      }
    },
    {
      name: 'audit-edge',
      testDir: './tests/audit-mobile',
      use: { ...mobileUse, channel: 'msedge' }
    },
    {
      name: 'audit-webkit',
      testDir: './tests/audit-mobile',
      use: { ...mobileUse, browserName: 'webkit' }
    },
    {
      name: 'audit-desktop',
      testDir: './tests/audit-desktop',
      use: {
        baseURL,
        viewport: { width: 1280, height: 720 },
        channel: 'msedge',
        trace: 'retain-on-failure'
      }
    }
  ]
});
