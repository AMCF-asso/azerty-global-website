const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const code = fs.readFileSync(path.join(root, '.eleventy.js'), 'utf8');

function configure(entries) {
  const copied = [];
  const fakeFs = { ...fs, existsSync: () => true,
    readdirSync: () => { throw new Error('Build must not enumerate untracked assets'); } };
  const fakeRequire = name => {
    if (name === 'fs') return fakeFs;
    if (name === 'child_process') return { execFileSync(_cmd, args) {
      if (!args.includes('--stage')) return '';
      return entries.filter(e => e.split('\t')[1].startsWith(args.at(-1) + '/')).join('\0');
    }};
    if (name.endsWith('landings.js')) return [];
    return require(name);
  };
  // The templates are unrelated to this test; only the public file boundary is exercised.
  fakeFs.existsSync = p => !p.endsWith(path.join('src','pages'));
  const context = { require:fakeRequire, __dirname:root, module:{exports:{}} };
  vm.runInNewContext(code, context);
  context.module.exports({addPassthroughCopy: item => copied.push(...Object.keys(item)),on(){},ignores:{add(){}}});
  return copied;
}
test('public build only copies tracked assets and excludes local exports', () => {
  const copied = configure(['100644 abc 0\tassets/logo.png']);
  assert.ok(copied.includes('assets/logo.png'));
  assert.ok(!copied.some(p=>p.includes('private-export')));
});
test('the named public Linux XCompose file remains downloadable', () => {
  assert.ok(configure(['100644 abc 0\tdata/.XCompose_global']).includes('data/.XCompose_global'));
});
for (const name of ['assets/.env', 'docs/backup.sql', 'assets/private.key', 'data/secrets.pfx']) {
  test('public build rejects even tracked sensitive files: '+name, () => {
    assert.throws(()=>configure(['100644 abc 0\t'+name]), /Private or temporary/);
  });
}
test('public build refuses symlinks to files outside the public tree', () => {
  assert.throws(()=>configure(['120000 abc 0\tassets/document.pdf']), /Unsupported public/);
});
