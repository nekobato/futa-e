const { version } = require('./package.json')

module.exports = {
  appId: 'net.netkobato.futa-e',
  productName: 'Futa E',
  artifactName: `Futa-e-v${version}-darwin-arm64.${'${ext}'}`,
  asar: true,
  npmRebuild: false,
  nodeGypRebuild: false,
  directories: {
    output: 'output/electron-builder',
    buildResources: 'resources'
  },
  protocols: {
    name: 'Futa E',
    schemes: ['futa-e']
  },
  files: ['dist/**/*', 'dist-electron/**/*', 'resources/**/*', 'package.json'],
  mac: {
    category: 'public.app-category.video',
    target: [
      {
        target: 'zip',
        arch: ['arm64']
      }
    ],
    icon: 'resources/app-icon.icns',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    notarize: true,
    publish: ['github'],
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    extendInfo: {
      NSHighResolutionCapable: true
    }
  }
}
