/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Rewrite kangaroo.config.ts with the DEV-build identity (CI checkout only —
 * never committed; same pattern as overwrite-with-test-name.js):
 *
 *   appId       org.lightningrodlabs.acorn      → org.lightningrodlabs.acorn.dev
 *   productName Acorn                           → Acorn Dev
 *   autoUpdates true                            → false
 *
 * The appId/productName split is what keeps a dev build safe next to a
 * production install on the same machine: a distinct data root (so the
 * already-installed production happ is NOT silently reused under the new UI —
 * the dev DNA actually gets installed), and a distinct default network seed
 * (Kangaroo derives it from productName + breaking version). autoUpdates off
 * so dev builds never try to update themselves from production releases.
 */
const fs = require('fs');

let config = fs.readFileSync('kangaroo.config.ts', 'utf-8');

const replacements = [
  ["appId: 'org.lightningrodlabs.acorn'", "appId: 'org.lightningrodlabs.acorn.dev'"],
  ["productName: 'Acorn'", "productName: 'Acorn Dev'"],
  ['autoUpdates: true', 'autoUpdates: false'],
];

for (const [from, to] of replacements) {
  if (!config.includes(from)) {
    throw new Error(`overwrite-with-dev-name: expected \`${from}\` in kangaroo.config.ts`);
  }
  config = config.replace(from, to);
}

fs.writeFileSync('kangaroo.config.ts', config, 'utf-8');
console.log('kangaroo.config.ts rewritten with dev identity (Acorn Dev / org.lightningrodlabs.acorn.dev, autoUpdates off)');
