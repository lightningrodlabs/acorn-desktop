/*
 * Vendor the Acorn harness modules (the LLM sidecar + its satellites) from the
 * acorn repo into ./harness, recording provenance. The sidecar is maintained in
 * lightningrodlabs/acorn (web/dev-harness/) and shared verbatim by the webpack
 * dev server, the standalone host, and THIS embedding — never edit ./harness
 * directly; change it upstream and re-run:
 *
 *   node scripts/sync-harness.js            # expects ../acorn
 *   ACORN_REPO=/path/to/acorn node scripts/sync-harness.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const acornRepo = path.resolve(process.env.ACORN_REPO || path.join(process.cwd(), '..', 'acorn'));
const destDir = path.join(process.cwd(), 'harness');

const FILES = [
  // [source (repo-relative), dest (harness-relative)]
  ['web/dev-harness/sidecar.js', 'sidecar.js'],
  ['web/dev-harness/bridges.js', 'bridges.js'],
  ['web/dev-harness/directBackend.js', 'directBackend.js'],
  ['web/dev-harness/promptContext.js', 'promptContext.js'],
  ['web/dev-harness/systemSlot.js', 'systemSlot.js'],
  ['web/dev-harness/skill.js', 'skill.js'],
  ['web/dev-harness/mcpConfig.js', 'mcpConfig.js'],
  ['web/dev-harness/acornToolsServer.js', 'acornToolsServer.js'],
  ['web/dev-harness/acorn-system-prompt.md', 'acorn-system-prompt.md'],
  ['clarity-engine/clarity-tree-skill.md', 'clarity-tree-skill.md'],
];

if (!fs.existsSync(path.join(acornRepo, 'web/dev-harness/sidecar.js'))) {
  throw new Error(`acorn repo not found at ${acornRepo} (set ACORN_REPO)`);
}

fs.mkdirSync(destDir, { recursive: true });
for (const [src, dest] of FILES) {
  const from = path.join(acornRepo, src);
  if (!fs.existsSync(from)) throw new Error(`missing in acorn repo: ${src}`);
  fs.copyFileSync(from, path.join(destDir, dest));
  console.log(`synced ${src}`);
}

let commit = 'unknown';
let branch = 'unknown';
try {
  commit = execSync('git rev-parse HEAD', { cwd: acornRepo }).toString().trim();
  branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: acornRepo }).toString().trim();
} catch (e) {
  console.warn('could not read acorn git state:', e.message);
}

fs.writeFileSync(
  path.join(destDir, 'PROVENANCE.md'),
  `# Vendored from lightningrodlabs/acorn — DO NOT EDIT HERE

Synced by scripts/sync-harness.js. Change these files upstream in the acorn
repo (web/dev-harness/, clarity-engine/) and re-run the sync.

- source: ${acornRepo}
- branch: ${branch}
- commit: ${commit}
- files: ${FILES.map(([s]) => s).join(', ')}
`
);
console.log(`\nvendored at ${destDir} (acorn ${branch} @ ${commit.slice(0, 8)})`);
