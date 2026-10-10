const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { spawn } = require('node:child_process');
const { EventEmitter, once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { stopOwnedProcessTree, resultExitCode } = require('../../scripts/run-e2e.js');

const projectRoot = path.resolve(__dirname, '..', '..');
const reporterPath = path.join(projectRoot, 'scripts', 'playwright-completion-reporter.js');
const runnerPath = path.join(projectRoot, 'scripts', 'run-e2e.js');

test('le reporter transmet le statut final Playwright par IPC', async () => {
  assert.equal(
    fs.existsSync(reporterPath),
    true,
    'le reporter de fin Playwright doit exister'
  );

  const Reporter = require(reporterPath);
  const reporter = new Reporter();
  const previousRunId = process.env.AZERTY_PLAYWRIGHT_RUN_ID;
  const previousSend = process.send;
  const messages = [];

  process.env.AZERTY_PLAYWRIGHT_RUN_ID = 'test-run-id';
  process.send = (message, callback) => {
    messages.push(message);
    if (callback) callback();
  };

  try {
    await reporter.onEnd({ status: 'passed' });
  } finally {
    process.send = previousSend;
    if (previousRunId === undefined) {
      delete process.env.AZERTY_PLAYWRIGHT_RUN_ID;
    } else {
      process.env.AZERTY_PLAYWRIGHT_RUN_ID = previousRunId;
    }
  }

  assert.deepEqual(messages, [{
    type: 'azerty-playwright-final',
    runId: 'test-run-id',
    status: 'passed'
  }]);
});

test('le reporter publie un bilan structure lorsque tous les tests sont termines', () => {
  const Reporter = require(reporterPath);
  const reporter = new Reporter();
  const previousRunId = process.env.AZERTY_PLAYWRIGHT_RUN_ID;
  const previousSend = process.send;
  const messages = [];

  process.env.AZERTY_PLAYWRIGHT_RUN_ID = 'progress-run-id';
  process.send = (message) => messages.push(message);

  try {
    assert.equal(typeof reporter.onBegin, 'function');
    assert.equal(typeof reporter.onTestEnd, 'function');
    reporter.onBegin({}, { allTests: () => [{ id: 'one' }, { id: 'two' }] });
    reporter.onTestEnd({ id: 'one', outcome: () => 'expected' }, { status: 'passed' });
    assert.deepEqual(messages, []);
    reporter.onTestEnd({ id: 'two', outcome: () => 'expected' }, { status: 'passed' });
    reporter.onError(new Error('late teardown failure'));
  } finally {
    process.send = previousSend;
    if (previousRunId === undefined) {
      delete process.env.AZERTY_PLAYWRIGHT_RUN_ID;
    } else {
      process.env.AZERTY_PLAYWRIGHT_RUN_ID = previousRunId;
    }
  }

  assert.deepEqual(messages, [
    {
      type: 'azerty-playwright-tests-complete',
      runId: 'progress-run-id',
      status: 'passed',
      expectedTests: 2,
      completedTests: 2
    },
    {
      type: 'azerty-playwright-tests-complete',
      runId: 'progress-run-id',
      status: 'failed',
      expectedTests: 2,
      completedTests: 2
    }
  ]);
});

test('le reporter attend la dernière tentative avant un bilan, et un retry réussi reste flaky', () => {
  const Reporter = require(reporterPath);
  const reporter = new Reporter();
  const previousRunId = process.env.AZERTY_PLAYWRIGHT_RUN_ID;
  const previousSend = process.send;
  const messages = [];

  process.env.AZERTY_PLAYWRIGHT_RUN_ID = 'retry-run-id';
  process.send = (message) => messages.push(message);

  try {
    reporter.onBegin({}, { allTests: () => [{ id: 'one' }, { id: 'two' }] });
    reporter.onTestEnd({ id: 'one', expectedStatus: 'passed', retries: 1, outcome: () => 'expected' }, { status: 'passed', retry: 0 });
    reporter.onTestEnd({ id: 'two', expectedStatus: 'passed', retries: 1, outcome: () => 'unexpected' }, { status: 'failed', retry: 0 });
    assert.deepEqual(messages, [], 'une tentative qui sera rejouée ne clôt pas le bilan');
    reporter.onTestEnd({ id: 'two', expectedStatus: 'passed', retries: 1, outcome: () => 'flaky' }, { status: 'passed', retry: 1 });
  } finally {
    process.send = previousSend;
    if (previousRunId === undefined) {
      delete process.env.AZERTY_PLAYWRIGHT_RUN_ID;
    } else {
      process.env.AZERTY_PLAYWRIGHT_RUN_ID = previousRunId;
    }
  }

  assert.deepEqual(messages, [{
    type: 'azerty-playwright-tests-complete',
    runId: 'retry-run-id',
    status: 'passed',
    expectedTests: 2,
    completedTests: 2
  }]);
});

test('le reporter clôt sur échec quand la dernière tentative échoue', () => {
  const Reporter = require(reporterPath);
  const reporter = new Reporter();
  const previousRunId = process.env.AZERTY_PLAYWRIGHT_RUN_ID;
  const previousSend = process.send;
  const messages = [];

  process.env.AZERTY_PLAYWRIGHT_RUN_ID = 'retry-fail-id';
  process.send = (message) => messages.push(message);

  try {
    reporter.onBegin({}, { allTests: () => [{ id: 'one' }] });
    reporter.onTestEnd({ id: 'one', expectedStatus: 'passed', retries: 1, outcome: () => 'unexpected' }, { status: 'timedOut', retry: 0 });
    reporter.onTestEnd({ id: 'one', expectedStatus: 'passed', retries: 1, outcome: () => 'unexpected' }, { status: 'failed', retry: 1 });
  } finally {
    process.send = previousSend;
    if (previousRunId === undefined) {
      delete process.env.AZERTY_PLAYWRIGHT_RUN_ID;
    } else {
      process.env.AZERTY_PLAYWRIGHT_RUN_ID = previousRunId;
    }
  }

  assert.equal(messages.length, 1);
  assert.equal(messages[0].status, 'failed');
});

test('le runner attend le signal IPC final sans déduire le succès de stdout', () => {
  const source = fs.readFileSync(runnerPath, 'utf8');

  assert.match(source, /child\.on\(['"]message['"]/);
  assert.match(source, /azerty-playwright-tests-complete/);
  assert.doesNotMatch(source, /completedTestIndexes|matchAll\(\/\\bok|completeSuccess/);
});

test('un arrêt forcé réussi conserve le verdict IPC, mais aucun arrêt raté ne passe', () => {
  assert.equal(resultExitCode(1, 0, true), 0);
  assert.equal(resultExitCode(1, 1, true), 1);
  assert.equal(resultExitCode(1, null, true), 1);
  assert.equal(resultExitCode(1, 0, true, true), 1);
  assert.equal(resultExitCode(1, 0), 1, 'un crash spontané ne doit pas être masqué');
  assert.equal(resultExitCode(0, 1), 1, 'un échec IPC ne doit pas être masqué');
});

// Lance le vrai run-e2e.js (donc le vrai Playwright, le vrai reporter IPC) sur
// une mini-suite jetable : aucun navigateur ni serveur, deux secondes par run.
// Garde-fou du 2026-10-10 : un run Playwright en échec doit rendre un code
// non nul, un run vert doit rendre 0, avec ou sans le reporter de la config.
function runRunnerOnTempSuite(specSource, extraArgs = []) {
  const playwrightTest = require.resolve('@playwright/test', { paths: [projectRoot] });
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'run-e2e-exit-'));
  fs.mkdirSync(path.join(dir, 'specs'));
  fs.writeFileSync(path.join(dir, 'specs', 'suite.spec.js'),
    `const { test, expect } = require(${JSON.stringify(playwrightTest)});\n${specSource}\n`);
  fs.writeFileSync(path.join(dir, 'playwright.config.js'), `
    const { defineConfig } = require(${JSON.stringify(playwrightTest)});
    module.exports = defineConfig({
      testDir: ${JSON.stringify(path.join(dir, 'specs'))},
      timeout: 10000,
      workers: 1,
      reporter: [['list'], [${JSON.stringify(reporterPath)}]]
    });
  `);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const child = spawn(process.execPath, [
    runnerPath, 'dist', '4173', `--config=${path.join(dir, 'playwright.config.js')}`, ...extraArgs
  ], { cwd: projectRoot, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', code => {
      fs.rmSync(dir, { recursive: true, force: true });
      resolve({ code, output });
    });
  });
}

test('un run Playwright en échec rend un code non nul, avec ou sans le reporter de la config', { timeout: 60000 }, async () => {
  const failing = `test('vert', async () => { expect(1).toBe(1); });
test('rouge', async () => { expect(1).toBe(2); });`;
  const viaConfigReporter = await runRunnerOnTempSuite(failing);
  assert.match(viaConfigReporter.output, /1 failed/);
  assert.notEqual(viaConfigReporter.code, 0, viaConfigReporter.output);
  // `--reporter=line` remplace les reporters de la config : plus aucun signal
  // IPC, le code de sortie de Playwright doit suffire.
  const viaCliReporter = await runRunnerOnTempSuite(failing, ['--reporter=line']);
  assert.match(viaCliReporter.output, /1 failed/);
  assert.notEqual(viaCliReporter.code, 0, viaCliReporter.output);
});

test('un run Playwright réussi rend 0, avec ou sans le reporter de la config', { timeout: 60000 }, async () => {
  const passing = `test('vert 1', async () => { expect(1).toBe(1); });
test('vert 2', async () => { expect(2).toBe(2); });`;
  for (const extraArgs of [[], ['--reporter=line']]) {
    const result = await runRunnerOnTempSuite(passing, extraArgs);
    assert.match(result.output, /2 passed/);
    assert.equal(result.code, 0, result.output);
  }
});

test('taskkill cible seulement le PID enfant et un code non nul refuse le nettoyage', async () => {
  const calls = [];
  const spawnFailure = (command, args, options) => {
    calls.push({ command, args, options });
    const stopper = new EventEmitter();
    queueMicrotask(() => stopper.emit('exit', 128));
    return stopper;
  };
  await assert.rejects(stopOwnedProcessTree({ pid: 12345 }, spawnFailure), /failed \(128\)/);
  assert.deepEqual(calls, [{
    command: 'taskkill.exe', args: ['/PID', '12345', '/T', '/F'],
    options: { stdio: 'ignore', windowsHide: true }
  }]);
});

test('Windows ferme les descendants créés et laisse un processus voisin vivant', { skip: process.platform !== 'win32', timeout: 15000 }, async () => {
  const options = { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true };
  const parent = spawn(process.execPath, ['-e', `
    const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
    child.once('spawn', () => process.send({ descendantPid: child.pid }));
    setInterval(() => {}, 1000);
  `], options);
  const neighbor = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], options);
  let descendantPid;
  const alive = pid => {
    if (!pid) return false;
    try { process.kill(pid, 0); return true; } catch (error) {
      if (error.code === 'ESRCH') return false;
      throw error;
    }
  };
  try {
    const [message] = await once(parent, 'message');
    descendantPid = message.descendantPid;
    assert.equal(alive(descendantPid), true);
    const parentExit = once(parent, 'exit');
    await stopOwnedProcessTree(parent);
    const [code] = await parentExit;
    for (let attempt = 0; attempt < 50 && alive(descendantPid); attempt++) await delay(20);
    assert.equal(alive(descendantPid), false, 'le descendant doit être arrêté');
    assert.equal(alive(neighbor.pid), true, 'le voisin hors de cet arbre doit rester vivant');
    assert.equal(resultExitCode(code, 0, true), 0);
  } finally {
    // These PIDs were all created by this test; never target unrelated servers.
    for (const child of [parent, { pid: descendantPid }, neighbor]) {
      if (alive(child.pid)) await stopOwnedProcessTree(child);
    }
  }
});
