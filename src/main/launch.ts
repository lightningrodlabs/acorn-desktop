import * as childProcess from 'child_process';
import { BrowserWindow } from 'electron';
import { KangarooEmitter } from './eventEmitter';
import { KangarooFileSystem } from './filesystem';
import { PasswordType } from './types';
import { RunOptions } from './cli';
import { initializeLairKeystore, launchLairKeystore } from './lairKeystore';
import {
  HAPP_APP_ID,
  HOLOCHAIN_BINARY,
  KANGAROO_CONFIG,
  LAIR_BINARY,
  UI_DIRECTORY,
} from './const';
import { createHappWindow, UISource } from './windows';
import { harnessConfigured, startHarnessHost } from './harnessHost';
import { ZomeCallSigner } from '@holochain/hc-spin-rust-utils';
import { HolochainManager } from './holochainManager';

export async function launch(
  kangarooFs: KangarooFileSystem,
  kangarooEmitter: KangarooEmitter,
  splashscreenWindow: BrowserWindow | undefined,
  passwordInput: PasswordType,
  runOptions: RunOptions
): Promise<{
  lairHandle: childProcess.ChildProcessWithoutNullStreams;
  holochainManager: HolochainManager;
  mainWindow: BrowserWindow;
  zomeCallSigner: ZomeCallSigner;
}> {
  let password: string;
  switch (passwordInput.type) {
    case 'random': {
      password = kangarooFs.readOrCreatePassword();
      break;
    }
    case 'user-provided': {
      password = passwordInput.password;
      break;
    }
  }

  if (!kangarooFs.keystoreInitialized()) {
    if (splashscreenWindow)
      splashscreenWindow.webContents.send(
        'loading-progress-update',
        'Initializing lair keystore...'
      );

    console.log('initializing lair keystore...');
    await initializeLairKeystore(
      runOptions.lairPath ? runOptions.lairPath : LAIR_BINARY,
      kangarooFs.keystoreDir,
      kangarooEmitter,
      password
    );
    console.log('lair keystore initialized.');
  }
  if (splashscreenWindow)
    splashscreenWindow.webContents.send('loading-progress-update', 'Starting lair keystore...');

  const [lairHandle, lairUrl] = await launchLairKeystore(
    runOptions.lairPath ? runOptions.lairPath : LAIR_BINARY,
    kangarooFs.keystoreDir,
    kangarooEmitter,
    password
  );

  const zomeCallSigner = await ZomeCallSigner.connect(lairUrl, password);

  if (splashscreenWindow)
    splashscreenWindow.webContents.send('loading-progress-update', 'Starting Holochain...');

  const holochainManager = await HolochainManager.launch(
    kangarooEmitter,
    kangarooFs,
    runOptions.holochainPath ? runOptions.holochainPath : HOLOCHAIN_BINARY,
    password,
    KANGAROO_CONFIG.bins.holochain.version,
    kangarooFs.conductorDir,
    kangarooFs.conductorConfigPath,
    lairUrl,
    runOptions.bootstrapUrl ? runOptions.bootstrapUrl.toString() : KANGAROO_CONFIG.bootstrapUrl,
    runOptions.signalUrl ? runOptions.signalUrl.toString() : KANGAROO_CONFIG.signalUrl,
    runOptions.iceUrls ? runOptions.iceUrls : KANGAROO_CONFIG.iceUrls,
    runOptions.holochainRustLog,
    runOptions.holochainWasmLog
  );

  // Install happ if necessary
  await holochainManager.installHappIfNecessary(runOptions.networkSeed);

  console.log('Happ installed.');

  const appToken = await holochainManager.getAppToken();

  // With a harness backend configured (ACORN_HARNESS_CMD or the direct-backend
  // env), serve the UI from the embedded harness host on localhost — same
  // origin as the sidecar WS, so the chat panel works with zero renderer
  // config. Without it, the stock webhapp:// path is untouched.
  // MUST happen BEFORE the splashscreen closes: window-all-closed quits the
  // app unconditionally (index.ts), so no await may sit between closing the
  // splash and constructing the main window.
  let uiSource: UISource = { type: 'path', path: UI_DIRECTORY };
  if (harnessConfigured()) {
    if (splashscreenWindow)
      splashscreenWindow.webContents.send('loading-progress-update', 'Starting LLM harness...');
    const host = await startHarnessHost({
      uiDir: UI_DIRECTORY,
      appId: HAPP_APP_ID,
      appPort: holochainManager.appPort,
      appToken,
    });
    uiSource = { type: 'port', port: host.port };
  }

  console.log('Starting main window...');

  if (splashscreenWindow) splashscreenWindow.close();

  const mainWindow = await createHappWindow(
    uiSource,
    HAPP_APP_ID,
    holochainManager.appPort,
    appToken,
    false
  );

  return {
    lairHandle,
    holochainManager,
    mainWindow,
    zomeCallSigner,
  };
}
