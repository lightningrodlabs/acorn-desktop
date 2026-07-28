/*
 * The embedded Acorn harness host — web/dev-harness/host.js's role, inside the
 * Kangaroo main process. When a harness backend is configured by env (the same
 * vars as the acorn repo's dev flow), we serve the unpacked webhapp UI from a
 * localhost HTTP server instead of the webhapp:// protocol, with:
 *
 *   • static files + SPA fallback over the UI directory
 *   • the __HC_LAUNCHER_ENV__ injection the webhapp:// handler does (windows.ts)
 *   • the WS sidecar at /__acorn_harness (vendored, see harness/PROVENANCE.md)
 *   • the /__acorn_tool + /__acorn_diff* bridges
 *
 * Same-origin with the UI, so the renderer needs no URL/CORS awareness — the
 * identical topology the acorn repo proves with hc-spin + host.js.
 *
 * The vendored modules are required at RUNTIME (createRequire) rather than
 * imported: bundling them would break sidecar.js's __dirname-relative spawn of
 * acornToolsServer.js and would hide their require('ws') etc. from node_modules
 * resolution.
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createRequire } from 'module';
import { app } from 'electron';
import { AppAuthenticationToken, InstalledAppId } from '@holochain/client';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

/** Same signal set the sidecar itself checks: an ACP agent command or a direct
 * OpenAI-compatible backend. No harness env → caller keeps the webhapp:// path
 * and the app behaves exactly like stock Kangaroo. */
export function harnessConfigured(): boolean {
  const cmd = process.env.ACORN_HARNESS_CMD;
  if (cmd && cmd.trim()) return true;
  return Boolean(process.env.ACORN_OPENAI_BASE_URL && process.env.ACORN_OPENAI_MODEL);
}

function harnessDir(): string {
  // dev: <repo>/harness. (Packaging note: ship this dir OUTSIDE app.asar —
  // extraResources or asarUnpack — because acornToolsServer.js is spawned as a
  // plain child process; revisit at packaging time.)
  return path.join(app.getAppPath(), 'harness');
}

export interface HarnessHostHandle {
  server: http.Server;
  port: number;
}

export async function startHarnessHost(opts: {
  uiDir: string;
  appId: InstalledAppId;
  appPort: number;
  appToken: AppAuthenticationToken;
}): Promise<HarnessHostHandle> {
  const dir = harnessDir();
  if (!fs.existsSync(path.join(dir, 'sidecar.js'))) {
    throw new Error(`harness modules missing at ${dir} — run \`node scripts/sync-harness.js\``);
  }

  // Defaults for the vendored copies; explicit env still wins, matching the
  // acorn dev flow.
  if (!process.env.ACORN_SYSTEM_PROMPT_FILE) {
    process.env.ACORN_SYSTEM_PROMPT_FILE = path.join(dir, 'acorn-system-prompt.md');
  }
  if (!process.env.ACORN_SKILL_PATH) {
    process.env.ACORN_SKILL_PATH = path.join(dir, 'clarity-tree-skill.md');
  }

  const nodeRequire = createRequire(__filename);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const sidecar: any = nodeRequire(path.join(dir, 'sidecar.js'));
  const bridges: any = nodeRequire(path.join(dir, 'bridges.js'));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // index.html with the launcher env seated — the exact transform the
  // webhapp:// handler applies in windows.ts, so the renderer can't tell the
  // difference.
  const indexHtml = (): string => {
    const raw = fs.readFileSync(path.join(opts.uiDir, 'index.html'), 'utf8');
    // __ACORN_HARNESS__ is the runtime signal that a harness lives on this
    // origin — it lights up the chat panel in the NORMAL release webhapp
    // (devSidecarClient.available), so no special UI build is needed.
    let content = raw.replace(
      '<head>',
      `<head><script type="module">window.__HC_LAUNCHER_ENV__ = { APP_INTERFACE_PORT: ${opts.appPort}, INSTALLED_APP_ID: "${opts.appId}", APP_INTERFACE_TOKEN: [${opts.appToken}] }; window.__ACORN_HARNESS__ = true;</script>`
    );
    content = content.replace(/<title>.*?<\/title>/i, '');
    return content;
  };

  const serveIndex = (res: http.ServerResponse): void => {
    res.statusCode = 200;
    res.setHeader('content-type', MIME['.html']);
    res.end(indexHtml());
  };

  const staticMiddleware = (req: http.IncomingMessage, res: http.ServerResponse): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.end('method not allowed');
      return;
    }
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    } catch (_e) {
      res.statusCode = 400;
      res.end('bad request');
      return;
    }
    const file = path.normalize(path.join(opts.uiDir, pathname));
    // traversal guard: everything served must stay under the UI dir
    if (!file.startsWith(opts.uiDir + path.sep) && file !== opts.uiDir) {
      res.statusCode = 403;
      res.end('forbidden');
      return;
    }
    const missing = !fs.existsSync(file) || fs.statSync(file).isDirectory();
    if (missing && path.extname(file)) {
      // a missing FILE (has an extension) is a real 404, not a SPA route —
      // windows.ts relies on this to detect an absent icon.png
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    if (file === opts.uiDir || file === path.join(opts.uiDir, 'index.html') || missing) {
      // index + SPA fallback both get the injected page
      serveIndex(res);
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  };

  // the same chain shape as host.js / webpack.dev.js, ending in static
  const chain = [
    sidecar.toolBridgeMiddleware,
    bridges.diffLocateDirMiddleware,
    bridges.diffLocateMiddleware,
    bridges.diffBridgeMiddleware,
    staticMiddleware,
  ];
  const server = http.createServer((req, res) => {
    let i = 0;
    const next = (): void => {
      const mw = chain[i++];
      if (!mw) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      mw(req, res, next);
    };
    next();
  });

  // FIXED port by default: the port is the browser ORIGIN, and the renderer's
  // localStorage/IndexedDB (profile-setup state, view prefs) are keyed by it —
  // an ephemeral port would make every launch look like a first run even
  // though the conductor data persisted. ACORN_HARNESS_PORT overrides
  // (0 = ephemeral, if you explicitly want a throwaway origin).
  const wantPort =
    process.env.ACORN_HARNESS_PORT != null && process.env.ACORN_HARNESS_PORT !== ''
      ? Number(process.env.ACORN_HARNESS_PORT)
      : 8931;
  const port: number = await new Promise((resolve, reject) => {
    server.once('error', (e: NodeJS.ErrnoException) => {
      reject(
        e.code === 'EADDRINUSE'
          ? new Error(
              `harness host port ${wantPort} is in use (another instance?) — set ACORN_HARNESS_PORT to change it`
            )
          : e
      );
    });
    server.listen(wantPort, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') resolve(addr.port);
      else reject(new Error('no address'));
    });
  });

  // The hosted MCP tools-server bridges back to us over HTTP on this port
  // (sidecar reads WEB_PORT when it builds the server entry) — must be set
  // before the first session is created, hence before attach.
  process.env.WEB_PORT = String(port);
  sidecar.attachHarnessSidecar(server);

  console.log(`[acorn-harness] embedded host serving ${opts.uiDir} on http://localhost:${port}`);
  return { server, port };
}
