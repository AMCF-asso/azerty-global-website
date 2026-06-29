const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TARGETS = ["dist", "dist-11ty"];

function assertInsideRoot(targetPath) {
  const resolved = path.resolve(targetPath);
  const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : `${ROOT}${path.sep}`;

  if (resolved !== ROOT && !resolved.startsWith(rootWithSep)) {
    throw new Error(`Refusing to clean path outside project root: ${resolved}`);
  }

  return resolved;
}

for (const target of TARGETS) {
  const targetPath = assertInsideRoot(path.join(ROOT, target));
  fs.rmSync(targetPath, { recursive: true, force: true });
}
