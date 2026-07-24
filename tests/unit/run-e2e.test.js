const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

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
