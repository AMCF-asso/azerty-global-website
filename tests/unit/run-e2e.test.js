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
