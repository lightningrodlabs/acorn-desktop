/*
 * Stage the vendored harness (./harness, see harness/PROVENANCE.md) into
 * resources/harness for the app to load — dev and packaged builds alike.
 * resources/** ships OUTSIDE app.asar (files + asarUnpack in
 * electron-builder.yml), which the harness requires: acornToolsServer.js is
 * spawned by path from the ACP agent — a plain Node process that cannot read
 * inside an asar archive.
 *
 * No node_modules are staged: the sidecar's runtime deps (ws + the ACP SDK)
 * are injected by the main process (harnessHost.ts → injectHarnessDeps), and
 * acornToolsServer.js is dependency-free by design.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(process.cwd(), 'harness');
const dest = path.join(process.cwd(), 'resources', 'harness');

if (!fs.existsSync(path.join(src, 'sidecar.js'))) {
  throw new Error('harness/ missing — run `node scripts/sync-harness.js` first');
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
for (const entry of fs.readdirSync(src)) {
  fs.cpSync(path.join(src, entry), path.join(dest, entry), { recursive: true });
}

console.log(`staged harness at ${dest}`);
