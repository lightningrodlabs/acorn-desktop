import { defineConfig } from './src/main/defineConfig';

export default defineConfig({
  appId: 'org.lightningrodlabs.acorn',
  productName: 'Acorn',
  version: '11.3.4',
  macOSCodeSigning: true,
  windowsEVCodeSigning: true,
  fallbackToIndexHtml: true,
  autoUpdates: true,
  systray: true,
  webhapp: {
    url: 'https://github.com/lightningrodlabs/acorn/releases/download/v11.3.1-alpha/acorn.webhapp',
    sha256: '948cac0497cc9402c71e11aaa6195b1eb24762384d6a67472b7f0c465140ed15',
  },
  passwordMode: 'password-optional',
  bootstrapUrl: 'https://dev-test-bootstrap2.holochain.org/',
  signalUrl: 'wss://dev-test-bootstrap2.holochain.org/',
  iceUrls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'],
  bins: {
    holochain: {
      version: '0.5.6',
      sha256: {
        'x86_64-unknown-linux-gnu':
          'b2dcba7e3f4ef6bb9d8eff33859a3bcb440bbf1f426e1b151ce24b6baaf32f81',
        'aarch64-unknown-linux-gnu':
          'ebbe002ea591c367b9f7e85074c2da651c3f54043820cae8bb2b42320fdb1f2f',
        'x86_64-pc-windows-msvc.exe':
          '74edb29ec5f0e5edfd19a46cc5b541d6764a534b75cccbd6a8c45ee9ce85dc0b',
        'x86_64-apple-darwin': 'e7c95fb736b7d34f4aa524938c0a8a1f4c5fcba21be46033f466baa357209ac2',
        'aarch64-apple-darwin': '2dc2ae70f3aa8732bf36fe7082a41d2871ceef1d13204002e4b9f544a5392ed8',      },
    },
    lair: {
      version: '0.6.2',
      sha256: {
        'x86_64-unknown-linux-gnu':
          '3c9ea3dbfc0853743dad3874856fdcfe391dca1769a6a81fc91b7578c73e92a7',
        'aarch64-unknown-linux-gnu':
          '2718e7242e3c78ae41afd0fa21bd82dfcfcbfaa72cb421a5067078140fce5142',
        'x86_64-pc-windows-msvc.exe':
          '6392ce85e985483d43fa01709bfd518f8f67aed8ddfa5950591b4ed51d226b8e',
        'x86_64-apple-darwin': '746403e5d1655ecf14d95bccaeef11ad1abfc923e428c2f3d87c683edb6fdcdc',
        'aarch64-apple-darwin': '05c7270749bb1a5cf61b0eb344a7d7a562da34090d5ea81b4c5b6cf040dd32e8',
      },
    },
  },
});
