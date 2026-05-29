const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const siteRoot = process.argv[2] || '.';
const port = process.argv[3] || '4173';

let cliPath;

try {
  cliPath = require.resolve('@playwright/test/cli');
} catch (error) {
  console.error('Missing dependency: @playwright/test. Run `npm install` before launching E2E tests.');
  process.exit(1);
}

try {
  const { webkit } = require('playwright');
  const webkitExecutable = webkit.executablePath();
  if (!fs.existsSync(webkitExecutable)) {
    console.error('Missing Playwright WebKit browser. Run `npx playwright install webkit` before launching E2E tests.');
    process.exit(1);
  }
} catch (error) {
  console.error('Unable to verify Playwright WebKit installation. Run `npx playwright install webkit` before launching E2E tests.');
  process.exit(1);
}

const env = {
  ...process.env,
  TEST_SITE_ROOT: siteRoot,
  TEST_SERVER_PORT: port
};

const child = spawn(process.execPath, [cliPath, 'test'], {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
