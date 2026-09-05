const path = require('path');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');

function stopOwnedProcessTree(child, spawnProcess = spawn) {
  return new Promise((resolve, reject) => {
    // The PID is the runner's own direct child. Kill its descendants before the
    // parent disappears; killing only the parent leaves inherited pipes open.
    const stopper = spawnProcess('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true
    });
    const timer = setTimeout(() => {
      stopper.kill();
      reject(new Error('Timed out stopping the owned Playwright process tree.'));
    }, 10000);
    stopper.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    stopper.once('exit', code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Stopping the owned Playwright process tree failed (${code}).`));
    });
  });
}

function resultExitCode(childCode, reporterCode, forcedStop = false, stopFailed = false) {
  if (stopFailed) return 1;
  // taskkill returns exit code 1 for the process it terminates. A confirmed IPC
  // verdict remains authoritative only after our explicit stop has succeeded.
  if (forcedStop) return reporterCode ?? 1;
  if (childCode !== null && childCode !== 0) return childCode;
  return reporterCode ?? childCode ?? 1;
}

function main() {
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
  let stoppingTree = false;

  child.on('message', message => {
    if (!message) return;
    if (message.runId !== env.AZERTY_PLAYWRIGHT_RUN_ID) return;
    if (!['azerty-playwright-final', 'azerty-playwright-tests-complete'].includes(message.type)) return;

    finalReporterExitCode = message.status === 'passed' ? 0 : 1;
    if (process.platform !== 'win32' || stoppingTree) return;

    clearTimeout(windowsExitTimer);
    const isFinalStatus = message.type === 'azerty-playwright-final';
    const gracePeriod = isFinalStatus ? 1500 : 10000;
    windowsExitTimer = setTimeout(async () => {
      if (child.exitCode !== null) return;
      stoppingTree = true;

      const statusLabel = isFinalStatus ? 'son statut final' : 'le bilan structure de tous les tests';
      console.warn(`\nPlaywright a publie ${statusLabel} mais conserve un handle Windows ouvert ; fermeture de son arbre de processus.`);
      try {
        await stopOwnedProcessTree(child);
        process.exit(resultExitCode(child.exitCode, finalReporterExitCode, true));
      } catch (error) {
        console.error(error.message);
        process.exit(resultExitCode(child.exitCode, finalReporterExitCode, true, true));
      }
    }, gracePeriod);
  });

  child.on('error', error => {
    console.error(`Impossible de lancer Playwright : ${error.message}`);
    process.exit(1);
  });

  child.on('close', code => {
    clearTimeout(windowsExitTimer);
    // Wait for taskkill's result: close can arrive with code 1 while the owned
    // tree is still being stopped, and cleanup failure must never become green.
    if (stoppingTree) return;
    process.exit(resultExitCode(code, finalReporterExitCode));
  });
}

if (require.main === module) main();
module.exports = { stopOwnedProcessTree, resultExitCode };
