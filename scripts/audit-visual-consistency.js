const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pagesDir = path.join(rootDir, 'src', 'pages');
const strict = process.argv.includes('--strict');

const backgroundUtilities = new Set([
  'bg-secondary',
  'bg-primary',
  'bg-card',
  'bg-accent',
  'bg-gradient-primary',
  'bg-gradient-warning',
  'bg-gradient-success',
  'bg-black',
  'bg-black-30',
  'bg-white',
  'bg-white-20',
  'bg-success-subtle'
]);

const allowedSectionClasses = new Set([
  'final-cta',
  'hero',
  'benefits',
  'section'
]);

const pageFiles = fs.readdirSync(pagesDir)
  .filter((file) => file.endsWith('.njk'))
  .sort();

const findings = [];

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function classTokens(classValue) {
  return classValue.split(/\s+/).map((token) => token.trim()).filter(Boolean);
}

function addFinding(file, line, kind, detail, excerpt) {
  findings.push({ file, line, kind, detail, excerpt: excerpt.trim().replace(/\s+/g, ' ') });
}

for (const file of pageFiles) {
  const fullPath = path.join(pagesDir, file);
  const source = fs.readFileSync(fullPath, 'utf8');
  const relative = path.relative(rootDir, fullPath).replace(/\\/g, '/');

  for (const match of source.matchAll(/\sstyle\s*=/g)) {
    addFinding(relative, lineNumber(source, match.index), 'style-inline', 'Style inline interdit par la CSP et incoherent avec le systeme visuel.', source.slice(match.index, match.index + 120));
  }

  for (const match of source.matchAll(/<section\b[^>]*class="([^"]+)"[^>]*>/g)) {
    const line = lineNumber(source, match.index);
    const classes = classTokens(match[1]);
    const bgTokens = classes.filter((token) => backgroundUtilities.has(token));
    const unknownSectionShape = classes.filter((token) =>
      /__section$/.test(token) && !allowedSectionClasses.has(token)
    );

    if (bgTokens.length > 0) {
      addFinding(
        relative,
        line,
        'section-background',
        `Fond applique a une section (${bgTokens.join(', ')}). A verifier : les sections doivent rester transparentes sauf exception motivee.`,
        match[0]
      );
    }

    if (unknownSectionShape.length > 0) {
      addFinding(
        relative,
        line,
        'custom-section-rhythm',
        `Classe de rythme de section specifique (${unknownSectionShape.join(', ')}). A comparer aux pages de reference avant reuse.`,
        match[0]
      );
    }
  }

  for (const match of source.matchAll(/class="([^"]+)"/g)) {
    const line = lineNumber(source, match.index);
    const classes = classTokens(match[1]);
    const gradientTokens = classes.filter((token) => token.startsWith('bg-gradient-'));
    const specialButtonTokens = classes.filter((token) =>
      token === 'bg-white' || token === 'bg-white-20' || token === 'bg-black-30'
    );

    if (gradientTokens.length > 0) {
      addFinding(
        relative,
        line,
        'gradient-utility',
        `Gradient utilitaire detecte (${gradientTokens.join(', ')}). A reserver aux composants existants, pas aux nouvelles sections.`,
        source.slice(match.index, match.index + 160)
      );
    }

    if (classes.includes('btn') && specialButtonTokens.length > 0) {
      addFinding(
        relative,
        line,
        'custom-button-background',
        `Bouton avec fond utilitaire specifique (${specialButtonTokens.join(', ')}). Preferer btn--primary, btn--secondary ou btn--success.`,
        source.slice(match.index, match.index + 160)
      );
    }
  }
}

const groups = findings.reduce((acc, finding) => {
  acc[finding.kind] = acc[finding.kind] || [];
  acc[finding.kind].push(finding);
  return acc;
}, {});

console.log('# Audit de coherence visuelle 11ty');
console.log('');
console.log('Regle de base : les pages doivent reutiliser le rythme existant. Les fonds de section qui changent le rythme de lecture doivent etre evites, sauf exception explicitement motivee et verifiee visuellement.');
console.log('');

if (findings.length === 0) {
  console.log('Aucune incoherence source evidente detectee.');
} else {
  for (const kind of Object.keys(groups).sort()) {
    console.log(`## ${kind} (${groups[kind].length})`);
    for (const finding of groups[kind]) {
      console.log(`- ${finding.file}:${finding.line} - ${finding.detail}`);
      console.log(`  ${finding.excerpt}`);
    }
    console.log('');
  }
}

if (strict && findings.length > 0) {
  process.exitCode = 1;
}
