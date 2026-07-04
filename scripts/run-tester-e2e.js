const path = require('path');
const { spawn } = require('child_process');

const siteRoot = process.argv[2] || '.';
const port = process.argv[3] || process.env.TEST_SERVER_PORT || '4175';
const projects = process.argv.slice(4);
const selectedProjects = projects.length > 0 ? projects : ['e2e'];

let cliPath;

try {
  cliPath = require.resolve('@playwright/test/cli');
} catch (error) {
  console.error('Missing dependency: @playwright/test. Run `npm install` before launching tester E2E tests.');
  process.exit(1);
}

const env = {
  ...process.env,
  TEST_SITE_ROOT: siteRoot,
  TEST_SERVER_PORT: port
};

const projectArgs = selectedProjects.flatMap((project) => [`--project=${project}`]);

const child = spawn(process.execPath, [
  cliPath,
  'test',
  'tests/e2e/tester.spec.js',
  ...projectArgs,
  '--workers=1'
], {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
