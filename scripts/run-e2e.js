const path = require('path');
const { randomUUID } = require('crypto');
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

const env = {
  ...process.env,
  TEST_SITE_ROOT: siteRoot,
  TEST_SERVER_PORT: port,
  AZERTY_PLAYWRIGHT_RUN_ID: randomUUID()
};

const playwrightArgs = process.argv.slice(4);
const child = spawn(process.execPath, [cliPath, 'test', ...playwrightArgs], {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: ['inherit', 'inherit', 'inherit', 'ipc']
});

let finalReporterExitCode = null;
let windowsExitTimer;
let hardExitTimer;

child.on('message', (message) => {
  if (!message) return;
  if (message.runId !== env.AZERTY_PLAYWRIGHT_RUN_ID) return;
  if (!['azerty-playwright-final', 'azerty-playwright-tests-complete'].includes(message.type)) return;

  finalReporterExitCode = message.status === 'passed' ? 0 : 1;
  if (process.platform !== 'win32') return;

  clearTimeout(windowsExitTimer);
  const isFinalStatus = message.type === 'azerty-playwright-final';
  const gracePeriod = isFinalStatus ? 1500 : 10000;
  windowsExitTimer = setTimeout(() => {
    if (child.exitCode !== null) return;

    const statusLabel = isFinalStatus ? 'son statut final' : 'le bilan structure de tous les tests';
    console.warn(`\nPlaywright a publie ${statusLabel} mais conserve un handle Windows ouvert ; fermeture du runner.`);
    child.kill();
    hardExitTimer = setTimeout(() => process.exit(finalReporterExitCode), 500);
  }, gracePeriod);
});

child.on('error', (error) => {
  console.error(`Impossible de lancer Playwright : ${error.message}`);
  process.exit(1);
});

child.on('close', (code) => {
  clearTimeout(windowsExitTimer);
  clearTimeout(hardExitTimer);

  if (code !== null && code !== 0) process.exit(code);
  process.exit(finalReporterExitCode ?? code ?? 1);
});
