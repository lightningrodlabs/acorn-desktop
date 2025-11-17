import { defineConfig } from './src/main/defineConfig';

export default defineConfig({
  appId: 'org.lightningrodlabs.acorn',
  productName: 'Acorn',
  version: '12.0.0-rc.0',
  macOSCodeSigning: true,
  windowsEVCodeSigning: true,
  fallbackToIndexHtml: true,
  autoUpdates: true,
  systray: true,
  webhapp: {
    url: 'https://github.com/lightningrodlabs/acorn/releases/download/happ-v12.0.0-rc.0/acorn.webhapp',
    sha256: 'e2c12b86a6bf0143529206167bc4069c60ba0850ea0f2bdc82d69468bde21d23',
  },
  passwordMode: 'password-optional',
  bootstrapUrl: 'https://dev-test-bootstrap2.holochain.org/',
  signalUrl: 'wss://dev-test-bootstrap2.holochain.org/',
  iceUrls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'],
  bins: {
    holochain: {
      version: '0.6.0-rc.1',
      sha256: {
        'x86_64-unknown-linux-gnu':
          '91a200205768754fa8841f3f71ba637c3e228e1b6a415eeb254ee8c43b75fae5',
        'x86_64-pc-windows-msvc.exe':
          'af0c2c7391c7547d6fa6203278419755e933ec83c41fb4d112a40b65cf7b6c44',
        'aarch64-unknown-linux-gnu': '188a7c6404e1fd1708f5b1b41826cf8c94a26274bbb8540096d0dec21382a1c3',
        'x86_64-apple-darwin': 'b954e8f969677897055647ab5df0e4da9a7044a4648f71959874a16cd9cd4329',
        'aarch64-apple-darwin': '68b199575b55e528dae5fd5073273f0b6b23b0d454121eee0809f2a501afe3d1',
      },
    },
    lair: {
      version: '0.6.3',
      sha256: {
        'x86_64-unknown-linux-gnu':
          '56beb19ca4abf39c8e2b90401a9ade10e5c395f6b95cd1853aac05643dce5a11',
        'x86_64-pc-windows-msvc.exe':
          '504e7e3d1afc4426990a4aee190f1137bb474ccb072f7049c23f43fc01c07009',
        'aarch64-unknown-linux-gnu': '2fcaf1482b70e3df614c631255b2c5af7f01c7927c95b00281a4a1404e2254b0',
        'x86_64-apple-darwin': 'd7521a0299ea425700091b78e02672b05ad4c97c2ca82643ea9ba2349b0e1e69',
        'aarch64-apple-darwin': 'cb26b8065f52f7e3ff2d24a09100f60f61a3214e25e170ac2ef607dd040800d7',
      },
    },
  },
});
