const fs = require('node:fs');
const path = require('node:path');

// Manual source-only cleanup for the next approved release, from 7 September.
// This command never builds, commits, pushes or deploys the website.
const source = path.join(__dirname, '..', 'src', 'pages', 'soutien.njk');
const content = fs.readFileSync(source, 'utf8');
const pattern = /        <!-- Temporary ZEVENT message: remove for the next approved release from 2026-09-07\. -->\r?\n        <p class="card mt-4" id="zevent-support-message">[^\n]+<\/p>\r?\n/g;
const matches = content.match(pattern) || [];
if (matches.length !== 1) {
  console.error(`Expected one temporary message, found ${matches.length}. Inspect the source before changing it.`);
  process.exitCode = 1;
} else if (process.argv.includes('--apply')) {
  fs.writeFileSync(source, content.replace(pattern, ''));
  console.log('Temporary message removed from the source. Build and review before any approved publication.');
} else {
  console.log('One temporary message found. From 2026-09-07, run with --apply to remove it from the source only.');
}
