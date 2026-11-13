// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { mkdir, readFile, readdir, writeFile, cp, rm, access, lstat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { assertSystemDeclarationIsolation } from './system-declarations.mjs';
const require = createRequire(import.meta.url);
const consumer = resolve('.cache/consumer');
const workspace = JSON.parse(await readFile('package.json', { encoding: 'utf8' }));
const versions = workspace.devDependencies;
execFileSync('pnpm', ['pack:all'], { stdio: 'inherit' });
// Every run is a fresh install, including after workspace dependency upgrades.
await rm(consumer, { recursive: true, force: true });
await mkdir(consumer, { recursive: true });
await writeFile(
  `${consumer}/package.json`,
  JSON.stringify(
    {
      name: 'mui-native-installed-consumer',
      private: true,
      dependencies: {
        react: versions.react,
        'react-native': versions['react-native'],
        'react-native-svg': versions['react-native-svg'],
      },
      devDependencies: {
        typescript: versions.typescript,
        '@types/react': versions['@types/react'],
      },
    },
    null,
    2,
  ),
);
const tarballs = (await readdir('artifacts/packages'))
  .filter((file) => file.endsWith('.tgz'))
  .map((file) => resolve('artifacts/packages', file));
execFileSync('npm', ['install', '--no-audit', '--no-fund', ...tarballs], {
  cwd: consumer,
  stdio: 'inherit',
});
for (const directory of await readdir('packages')) {
  const manifest = JSON.parse(
    await readFile(`packages/${directory}/package.json`, { encoding: 'utf8' }),
  );
  for (const notice of ['LICENSE', 'NOTICE']) {
    const expected = await readFile(`packages/${directory}/${notice}`, 'utf8');
    const installed = await readFile(`${consumer}/node_modules/${manifest.name}/${notice}`, 'utf8');
    if (installed !== expected) throw new Error(`${manifest.name}: installed ${notice} differs`);
  }
}
// Inspect actual installed declarations, including inferred import() result
// types. A full workspace install can otherwise conceal a reverse dependency.
async function systemDeclarations(directory, prefix = '') {
  const result = new Map();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory())
      for (const [file, source] of await systemDeclarations(path, name + '/'))
        result.set(file, source);
    else if (/\.d\.[cm]?ts$/.test(name)) result.set(name, await readFile(path, 'utf8'));
  }
  return result;
}
assertSystemDeclarationIsolation(
  await systemDeclarations(`${consumer}/node_modules/@altroo/mui-native-system/dist`),
);
console.log('Installed System declarations remain independent of Material.');
// A published native package must retain source/config needed by autolinking and codegen.
const nativeHost = `${consumer}/node_modules/@altroo/mui-native-host`;
// BEGIN RETIRED RAWTEXT ARCHIVE GUARD
async function assertNoRetiredRawText(host) {
  for (const file of [
    'common/cpp/AltrooLiteralRawTextShadowNode.cpp',
    'common/cpp/AltrooLiteralRawTextShadowNode.h',
    'common/cpp/AltrooLiteralRawTextComponentDescriptor.h',
    'common/cpp/LiteralRttiBindingDiagnostic.h',
    'src/generatedLiteralRun.tsx',
    'dist/generatedLiteralRun.js',
    'dist/generatedLiteralRun.js.map',
    'dist/generatedLiteralRun.d.ts',
  ]) {
    try {
      await lstat(`${host}/${file}`);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    throw Error('Retired own RawText experiment remains packaged: ' + file);
  }
  const manifest = JSON.parse(await readFile(`${host}/package.json`, 'utf8'));
  if (Object.hasOwn(manifest.codegenConfig.ios.componentProvider, 'AltrooMUILiteralRawText'))
    throw Error('Retired own RawText iOS provider remains packaged');
  if (
    (await readFile(`${host}/react-native.config.js`, 'utf8')).includes(
      'AltrooLiteralRawTextComponentDescriptor',
    )
  )
    throw Error('Retired own RawText Android descriptor remains packaged');
}
await assertNoRetiredRawText(nativeHost);
// END RETIRED RAWTEXT ARCHIVE GUARD

const structuralFiles = [
  'AltrooMuiNativeHost.podspec',
  'android/CMakeLists.txt',
  'android/build.gradle',
  'react-native.config.js',
  'native-input-baseline.json',
  'scripts/verify-native-input.cjs',
  'structural-observation-baseline.json',
  'scripts/verify-structural-input.cjs',
  'src/NativeAltrooStructuralObserver.ts',
  'src/structuralObserverClient.ts',
  'dist/NativeAltrooStructuralObserver.js',
  'dist/NativeAltrooStructuralObserver.d.ts',
  'dist/structuralObserverClient.js',
  'dist/structuralObserverClient.d.ts',
  'common/cpp/AltrooStructuralObserver.h',
  'common/cpp/AltrooStructuralObserver.cpp',
  'common/cpp/StructuralObservationState.h',
  'ios/AltrooStructuralObserverProvider.h',
  'ios/AltrooStructuralObserverProvider.mm',
  'android/src/main/java/com/altroo/muinativehost/AltrooMUIStructuralViewManager.java',
  'android/src/main/java/com/altroo/muinativehost/AltrooMuiNativeHostPackage.kt',
  'common/cpp/AltrooPrelayoutProbe.cpp',
  'common/cpp/AltrooPrelayoutProbe.h',
  'common/cpp/AltrooStructuralStyleRuntime.h',
  'common/cpp/AltrooStructuralViewShadowNode.h',
  'common/cpp/ChannelProbe.h',
  'common/cpp/GeneratedConversion.h',
  'common/cpp/GeneratedParagraphOrigin.h',
  'common/cpp/OwnedBackgroundPayload.h',
  'common/cpp/OwnedConversionProbe.h',
  'common/cpp/OwnedProgramme.h',
  'common/cpp/OwnedPropsTransport.h',
  'common/cpp/OwnedStyleMetadata.h',
  'common/cpp/PrelayoutJournal.h',
  'common/cpp/PrelayoutResolver.h',
  'common/cpp/PreparedOwnedCandidates.h',
  'common/cpp/StructuralComponentName.h',
  'common/cpp/StructuralStyleErrorNotification.h',
  'common/cpp/StructuralStyleRuntimeState.h',
  'common/cpp/react/renderer/components/AltrooMuiNativeHostSpec/ComponentDescriptors.h',
  'dist/AltrooMUIStructuralViewNativeComponent.d.ts',
  'dist/AltrooMUIStructuralViewNativeComponent.js',
  'dist/AndroidPrelayoutController.d.ts',
  'dist/AndroidPrelayoutController.js',
  'dist/NativeAltrooPrelayoutProbe.d.ts',
  'dist/NativeAltrooPrelayoutProbe.js',
  'dist/internal/owned-view/index.d.ts',
  'dist/internal/owned-view/index.js',
  'dist/ownedStructuralHost.d.ts',
  'dist/ownedStructuralHost.js',
  'dist/ownedStyleBootstrap.d.ts',
  'dist/ownedStyleBootstrap.js',
  'dist/ownedStyleEncoding.d.ts',
  'dist/ownedStyleEncoding.js',
  'dist/ownedStyleMetadata.d.ts',
  'dist/ownedStyleMetadata.js',
  'dist/ownedStyleTypes.d.ts',
  'dist/ownedStyleTypes.js',
  'dist/ownedStyleVocabulary.d.ts',
  'dist/ownedStyleVocabulary.js',
  'dist/structuralStyleActivation.d.ts',
  'dist/structuralStyleActivation.js',
  'ios/AltrooMUIPortalHostComponentView.mm',
  'ios/AltrooMUIStructuralViewComponentView.h',
  'ios/AltrooMUIStructuralViewComponentView.mm',
  'ios/AltrooPrelayoutProbeProvider.h',
  'ios/AltrooPrelayoutProbeProvider.mm',
  'src/AltrooMUIStructuralViewNativeComponent.ts',
  'src/AndroidPrelayoutController.ts',
  'src/NativeAltrooPrelayoutProbe.ts',
  'src/internal/owned-view/index.ts',
  'src/ownedStructuralHost.tsx',
  'src/ownedStyleBootstrap.ts',
  'src/ownedStyleEncoding.ts',
  'src/ownedStyleMetadata.ts',
  'src/ownedStyleRNTypes.d.ts',
  'src/ownedStyleTypes.ts',
  'src/ownedStyleVocabulary.ts',
  'src/structuralStyleActivation.ts',
];
// Compare real archive bytes, so a stale source/provider cannot pass by name.
for (const file of structuralFiles) {
  const [source, installed] = await Promise.all([
    readFile(`packages/native-host/${file}`),
    readFile(`${nativeHost}/${file}`),
  ]);
  if (!source.equals(installed)) throw new Error(`Installed structural input differs: ${file}`);
}
for (const file of [
  'react-native.config.js',
  'native-input-baseline.json',
  'scripts/verify-native-input.cjs',
  'src/nativeTextInput.tsx',
  'src/nativeTextInputRuntime.js',
  'src/nativeTextInputNativeComponent.js',
  'src/AltrooMUITextInputNativeComponent.ts',
  'dist/nativeTextInputRuntime.js',
  'dist/nativeTextInputNativeComponent.js',
  'common/cpp/AltrooNativeTextInputDescriptor.h',
  'android/src/main/java/com/altroo/muinativehost/AltrooMUITextInput.kt',
  'android/src/main/java/com/altroo/muinativehost/AltrooMUITextInputManager.kt',
  'android/src/main/java/com/altroo/muinativehost/AltrooTextInputState.java',
  'android/src/main/java/com/altroo/muinativehost/NativeTextInputMetadata.kt',
  'ios/AltrooMUITextInputComponentView.h',
  'ios/AltrooMUITextInputComponentView.mm',
  'ios/AltrooMUIManagedTextInput.h',
  'ios/AltrooMUIManagedTextInput.mm',
  'src/AltrooMUIPortalHostNativeComponent.ts',
  'src/AltrooMUIPortalCanvasNativeComponent.ts',
  'src/nativePortal.tsx',
  'src/portalCoordinates.ts',
  'android/src/main/java/com/altroo/muinativehost/PortalObservationGeometry.kt',
  'android/src/main/java/com/altroo/muinativehost/PortalObservationRect.kt',
  'android/src/main/java/com/altroo/muinativehost/PortalObservationEvent.kt',
  'android/src/main/java/com/altroo/muinativehost/DescendantKeyPolicy.kt',
  'android/src/main/java/com/altroo/muinativehost/DescendantKeyWindow.kt',
  'android/src/main/java/com/altroo/muinativehost/PortalPaddingBox.java',
  'ios/AltrooPortalObservation.h',
  'ios/AltrooPortalObservation.mm',
  'ios/AltrooPortalPlanarTransform.h',
  'android/CMakeLists.txt',
  'common/cpp/AltrooPortalShadowNodes.h',
  'common/cpp/AltrooPortalShadowNodes.cpp',
  'common/cpp/react/renderer/components/AltrooMuiNativeHostSpec/ComponentDescriptors.h',
  'android/src/main/java/com/altroo/muinativehost/AltrooMUIPortalHost.kt',
  'android/src/main/java/com/altroo/muinativehost/AltrooMUIPortalHostManager.kt',
  'android/src/main/java/com/altroo/muinativehost/AltrooMUIPortalCanvasManager.kt',
  'android/src/main/java/com/altroo/muinativehost/PortalLogicalParent.kt',
  'ios/AltrooMUIPortalHostComponentView.mm',
  'ios/AltrooMUIPortalCanvasComponentView.mm',
  'ios/AltrooPortalLogicalParent.h',
  'ios/AltrooPortalClipping.h',
  'ios/AltrooPortalClipping.mm',
  'AltrooMuiNativeHost.podspec',
  'src/AltrooMUIInteractiveViewNativeComponent.ts',
  'src/nativeKeyboard.ts',
  'src/AltrooMUINativePickerNativeComponent.ts',
  'src/nativePicker.tsx',
  'android/src/main/java/com/altroo/muinativehost/AltrooMUINativePicker.kt',
  'android/src/main/java/com/altroo/muinativehost/AltrooMUINativePickerManager.kt',
  'android/src/main/java/com/altroo/muinativehost/PickerPresentationState.kt',
  'ios/AltrooMUINativePickerComponentView.h',
  'ios/AltrooMUINativePickerComponentView.mm',
  'android/build.gradle',
  'android/src/main/java/com/altroo/muinativehost/AltrooMUIInteractiveViewDelegate.java',
  'ios/AltrooMUIInteractiveViewComponentView.mm',
])
  await access(`${nativeHost}/${file}`);
for (const directory of ['build', '.cxx', '.gradle']) {
  try {
    await access(`${nativeHost}/android/${directory}`);
  } catch (error) {
    if (error.code === 'ENOENT') continue;
    throw error;
  }
  throw new Error(`Native host archive includes Android build output: ${directory}`);
}
/** @type {{codegenConfig: {type: string, ios: {componentProvider: Record<string, string>, modulesProvider: Record<string, string>}}}} */
const hostManifest = JSON.parse(await readFile(`${nativeHost}/package.json`, { encoding: 'utf8' }));
const sourceCodegen = JSON.parse(
  await readFile('packages/native-host/package.json', 'utf8'),
).codegenConfig;
if (!isDeepStrictEqual(hostManifest.codegenConfig, sourceCodegen))
  throw new Error('Installed native codegen configuration differs from source');
if (
  hostManifest.codegenConfig.ios.componentProvider.AltrooMUIInteractiveView !==
  'AltrooMUIInteractiveViewComponentView'
)
  throw new Error('Missing native host Fabric registration');
if (
  hostManifest.codegenConfig.ios.componentProvider.AltrooMUINativePicker !==
  'AltrooMUINativePickerComponentView'
)
  throw new Error('Missing native picker Fabric registration');
for (const name of ['AltrooMUIPortalHost', 'AltrooMUIPortalCanvas']) {
  if (hostManifest.codegenConfig.ios.componentProvider[name] !== name + 'ComponentView')
    throw new Error('Missing Portal Fabric registration: ' + name);
}
if (
  hostManifest.codegenConfig.ios.componentProvider.AltrooMUITextInput !==
  'AltrooMUITextInputComponentView'
)
  throw new Error('Missing native editor Fabric registration');
execFileSync(process.execPath, [resolve(nativeHost, 'scripts/verify-native-input.cjs')], {
  cwd: consumer,
  stdio: 'inherit',
});
if (
  hostManifest.codegenConfig.type !== 'all' ||
  hostManifest.codegenConfig.ios.modulesProvider?.AltrooStructuralObserver !==
    'AltrooStructuralObserverProvider'
)
  throw new Error('Missing structural C++ module codegen registration');
const hostConfig = require(resolve(nativeHost, 'react-native.config.js'));
if (hostConfig.dependency?.platforms?.android?.cxxModuleHeaderName !== 'AltrooStructuralObserver')
  throw new Error('Missing installed Android structural C++ provider');
execFileSync(process.execPath, [resolve(nativeHost, 'scripts/verify-structural-input.cjs')], {
  cwd: consumer,
  stdio: 'inherit',
});
console.log('Installed native host retains autolinking, codegen and platform sources.');
await cp('fixtures/native-consumer', consumer, { recursive: true });
await cp('fixtures/icons-consumer/consumer.tsx', `${consumer}/icon-catalog.tsx`);
// Artwork license notices must survive actual archive installation, not a workspace symlink.
for (const notice of ['THIRD_PARTY_NOTICES.md', 'LICENSE.material-icons']) {
  const expected = await readFile(`packages/icons/${notice}`, 'utf8');
  const installed = await readFile(
    `${consumer}/node_modules/@altroo/mui-native-icons/${notice}`,
    'utf8',
  );
  if (installed !== expected) throw new Error(`Installed icons ${notice} differs`);
}
await writeFile(
  `${consumer}/tsconfig.native.json`,
  JSON.stringify(require('../packages/compat/index.cjs').createNativeTsconfig(), null, 2),
);
execFileSync(
  resolve(consumer, 'node_modules/.bin/tsc'),
  ['--project', 'tsconfig.native.json', '--noEmit'],
  { cwd: consumer, stdio: 'inherit' },
);
// Keep completed strict-optional contracts isolated from unrelated preview APIs.
// This checks installed declarations and resolver paths, not workspace sources.
await writeFile(
  `${consumer}/tsconfig.exact-optional.native.json`,
  JSON.stringify(
    {
      extends: './tsconfig.native.json',
      compilerOptions: { exactOptionalPropertyTypes: true },
      include: [
        'button-group-exact-optional.tsx',
        'rtl-provider-exact-optional.tsx',
        'default-props-contract.tsx',
        'native-root-style-contract.tsx',
      ],
    },
    null,
    2,
  ),
);
execFileSync(
  resolve(consumer, 'node_modules/.bin/tsc'),
  ['--project', 'tsconfig.exact-optional.native.json', '--noEmit'],
  { cwd: consumer, stdio: 'inherit' },
);
console.log('Installed strict optional Group, RTL and DefaultProps provider contracts passed.');
// This helper fixture disables different breakpoint keys from the ordinary
// consumer. Compile it separately so their module augmentations cannot leak.
await cp('fixtures/helper-contract-consumer/consumer.ts', `${consumer}/helper-contract.ts`);
await writeFile(
  `${consumer}/tsconfig.helper-contract.native.json`,
  JSON.stringify(
    {
      extends: './tsconfig.native.json',
      compilerOptions: { exactOptionalPropertyTypes: true },
      include: ['helper-contract.ts'],
    },
    null,
    2,
  ),
);
execFileSync(
  resolve(consumer, 'node_modules/.bin/tsc'),
  ['--project', 'tsconfig.helper-contract.native.json', '--noEmit'],
  { cwd: consumer, stdio: 'inherit' },
);
console.log(
  'Installed strict spacing/breakpoint/color/timing helper contracts passed independently.',
);
// Each wrapper gets an isolated strict consumer so class augmentation cannot
// accidentally satisfy another fixture through a shared compiler invocation.
for (const [contract, fixture] of [
  ['form-group-contract', 'consumer.tsx'],
  ['list-item-avatar', 'consumer.tsx'],
  ['list-item-icon', 'consumer.tsx'],
  ['accordion-details', 'native.tsx'],
  ['accordion-actions', 'native.tsx'],
  ['card-actions', 'native.tsx'],
  ['dialog-actions', 'native.tsx'],
  ['dialog-title', 'native.tsx'],
  ['circular-progress', 'native.tsx'],
  ['linear-progress', 'native.tsx'],
  ['accordion-classes', 'native.tsx'],
  ['button-base-classes', 'native.tsx'],
  ['typography', 'native.tsx'],
  ['paper', 'native.tsx'],
  ['box', 'native.tsx'],
  ['card', 'native.tsx'],
  ['theme-reading', 'consumer.tsx'],
  ['theme-props', 'consumer.tsx'],
]) {
  await cp(`fixtures/${contract}-consumer/${fixture}`, `${consumer}/${contract}.tsx`);
  const config = `tsconfig.${contract}.native.json`;
  await writeFile(
    `${consumer}/${config}`,
    JSON.stringify(
      {
        extends: './tsconfig.native.json',
        compilerOptions: { exactOptionalPropertyTypes: true },
        include: [`${contract}.tsx`],
      },
      null,
      2,
    ),
  );
  execFileSync(resolve(consumer, 'node_modules/.bin/tsc'), ['--project', config, '--noEmit'], {
    cwd: consumer,
    stdio: 'inherit',
  });
}
console.log(
  'Installed strict FormGroup, Avatar, Icon, AccordionDetails, AccordionActions, CardActions, DialogActions, DialogTitle, CircularProgress, LinearProgress, Typography, Paper, Box, Card, Theme reading and Theme props contracts passed independently.',
);
execFileSync(process.execPath, ['scripts/check-consumer-default-props.cjs', consumer], {
  stdio: 'inherit',
});
execFileSync(process.execPath, ['scripts/check-consumer-contexts.cjs', consumer], {
  stdio: 'inherit',
});
const lock = JSON.parse(await readFile(`${consumer}/package-lock.json`, { encoding: 'utf8' }));
if (
  Object.keys(lock.packages).some(
    (name) => name.endsWith('/react-dom') || name.includes('node_modules/@mui/'),
  )
)
  throw new Error('Browser MUI entered the native installed consumer');
console.log(
  'Installed tarballs: root/deep imports, theme augmentation, X types, native isolation, and distribution notices passed.',
);
