import { mkdir, readFile, readdir, writeFile, cp, rm, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
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
// A published native package must retain source/config needed by autolinking and codegen.
const nativeHost = `${consumer}/node_modules/@altroo/mui-native-host`;
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
/** @type {{codegenConfig: {ios: {componentProvider: Record<string, string>}}}} */
const hostManifest = JSON.parse(await readFile(`${nativeHost}/package.json`, { encoding: 'utf8' }));
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
console.log('Installed native host retains autolinking, codegen and platform sources.');
await cp('fixtures/native-consumer', consumer, { recursive: true });
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
      include: ['button-group-exact-optional.tsx', 'rtl-provider-exact-optional.tsx'],
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
console.log('Installed strict optional Group and RTL provider contracts passed.');
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
