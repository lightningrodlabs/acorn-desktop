const fs = require('fs');
const path = require('path');
const { notarize } = require('@electron/notarize');

module.exports = async function (params) {
  if (process.platform !== 'darwin') {
    return;
  }

  console.log('afterSign hook triggered', params);

  // electron-builder's mac signApp() reports success even when no identity was
  // found and nothing was signed (24.x), so this hook fires on unsigned builds
  // too. Without Apple credentials there is nothing to notarize — skip rather
  // than fail on @electron/notarize's signature check.
  if (!process.env.APPLE_ID_EMAIL || !process.env.APPLE_ID_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log('Skip notarizing. APPLE_ID_EMAIL / APPLE_ID_PASSWORD / APPLE_TEAM_ID not set (unsigned build).');
    return;
  }

  const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath)) {
    console.log(`Skip notarizing. No app found at path ${appPath}.`);
    return;
  }

  console.log(`Notarizing app found at ${appPath}.`);

  await notarize({
    appPath: appPath,
    appleId: process.env.APPLE_ID_EMAIL,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });

  console.log(`Done notarizing.`);
};
