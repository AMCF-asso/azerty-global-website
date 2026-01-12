const fs = require('fs');
const j = JSON.parse(fs.readFileSync('tester/azerty-global.json', 'utf8'));

const lines = [];
lines.push('{');
lines.push('  "name": "azerty-global",  "version": "2026",');
lines.push('  "geometry": "iso",');
lines.push('  "capslock": true,');
lines.push('  "altgr": true,');
lines.push('  "keymap": {');

const keymapEntries = Object.entries(j.keymap);
keymapEntries.forEach(([k, v], i) => {
  const comma = i < keymapEntries.length - 1 ? ',' : '';
  lines.push('    "' + k + '": ' + JSON.stringify(v) + comma);
});

lines.push('  },');
lines.push('  "deadkeys": {');

const deadkeyEntries = Object.entries(j.deadkeys);
deadkeyEntries.forEach(([k, v], i) => {
  const comma = i < deadkeyEntries.length - 1 ? ',' : '';
  lines.push('    "' + k + '": ' + JSON.stringify(v) + comma);
});

lines.push('  }');
lines.push('}');

fs.writeFileSync('tester/azerty-global.json', lines.join('\n'));
console.log('Reformatted azerty-global.json');
