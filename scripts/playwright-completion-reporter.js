'use strict';

class PlaywrightCompletionReporter {
  constructor() {
    this.status = 'failed';
    this.hasGlobalError = false;
    this.expectedTests = 0;
    this.testOutcomes = new Map();
  }

  onBegin(config, suite) {
    this.expectedTests = suite.allTests().length;
  }

  onError() {
    this.hasGlobalError = true;
    this.publishTestCompletion();
  }

  onTestEnd(test, result) {
    // With retries (CI only), a failed attempt that will be retried is not a
    // verdict: announcing it would let the Windows runner stop the tree
    // mid-retry. Only a test's last attempt counts; a retried pass is 'flaky'.
    const willRetry = result
      && result.status !== 'skipped'
      && result.status !== test.expectedStatus
      && result.retry < (test.retries || 0);
    if (willRetry) return;
    this.testOutcomes.set(test.id, test.outcome());
    this.publishTestCompletion();
  }

  publishTestCompletion() {
    if (this.expectedTests === 0 || this.testOutcomes.size !== this.expectedTests) return;

    const hasUnexpectedTest = [...this.testOutcomes.values()]
      .some((outcome) => outcome === 'unexpected');
    this.send({
      type: 'azerty-playwright-tests-complete',
      status: this.hasGlobalError || hasUnexpectedTest ? 'failed' : 'passed',
      expectedTests: this.expectedTests,
      completedTests: this.testOutcomes.size
    });
  }

  onEnd(result) {
    this.status = result.status;
    return new Promise((resolve) => {
      this.send({
        type: 'azerty-playwright-final',
        status: this.hasGlobalError ? 'failed' : this.status
      }, resolve);
    });
  }

  send(message, callback) {
    const runId = process.env.AZERTY_PLAYWRIGHT_RUN_ID;
    if (!runId || typeof process.send !== 'function') {
      if (callback) callback();
      return;
    }

    process.send({ ...message, runId }, callback);
  }

  printsToStdio() {
    return false;
  }
}

module.exports = PlaywrightCompletionReporter;
