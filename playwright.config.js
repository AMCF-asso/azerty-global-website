const { defineConfig, devices } = require('@playwright/test');

const port = Number(process.env.TEST_SERVER_PORT || 4173);
const host = process.env.TEST_SERVER_HOST || process.env.HOST || '127.0.0.1';
const baseURL = `http://${host}:${port}`;
const siteRoot = process.env.TEST_SITE_ROOT || '.';
const desktopBrowser = process.env.TEST_BROWSER || '';
const desktopChannel = process.env.TEST_BROWSER_CHANNEL || 'msedge';

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

function desktopUse(extra = {}) {
  const use = {
    baseURL,
    trace: 'retain-on-failure',
    ...extra
  };

  if (desktopBrowser) {
    use.browserName = desktopBrowser;
    if (desktopBrowser === 'firefox') {
      use.launchOptions = {
        ...(use.launchOptions || {}),
        firefoxUserPrefs: {
          ...((use.launchOptions && use.launchOptions.firefoxUserPrefs) || {}),
          'network.proxy.type': 0,
          'network.proxy.no_proxies_on': 'localhost, 127.0.0.1'
        }
      };
    }
  } else {
    use.channel = desktopChannel;
  }

  return use;
}

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
      use: desktopUse()
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
      use: desktopUse({
        viewport: { width: 1280, height: 720 },
      })
    }
  ]
});
