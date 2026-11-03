# @altroo/mui-native-compat

Opt-in Metro and TypeScript import routing for MUI Native. Experimental pre-alpha.

**Pre-alpha preview.** Expect incomplete APIs and breaking changes. This is an independent Altroo project, not an official or endorsed MUI product. Pro/Premium source and paid-only feature parity are excluded.

## Install

```sh
npm install @altroo/mui-native-compat@prealpha
```

The matched development baseline is React 19.3 / React Native 0.88.1 (Expo SDK 58). Review the [installation guide](https://github.com/Altroo/mui-native/blob/main/docs/installation.md) before using another runtime. Keep `@altroo/mui-native-host` as a direct application dependency when using Material or X components. Rebuild the native application after installing/updating native code; Expo Go does not contain these hosts.

## Configure Metro

Install the Material/native-host packages as well, then wrap the existing Expo Metro configuration:

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withMuiNative } = require('@altroo/mui-native-compat/metro');
module.exports = withMuiNative(getDefaultConfig(__dirname));
```

Only registered native subpaths are mapped. Web keeps original MUI imports. The installation guide also shows `createNativeTsconfig()` for application type checking; TypeScript paths alone do not configure Metro.

## Current scope

Native import routing and supported-path guards.

See the [component status](https://github.com/Altroo/mui-native#status), [compatibility contract](https://github.com/Altroo/mui-native/blob/main/docs/compatibility.md) and [package guide](https://github.com/Altroo/mui-native/blob/main/docs/installation.md). Scoped emulator tests and type checks do not certify full physical-device, accessibility or release-performance behavior.

## License

Original code is [MIT licensed](https://github.com/Altroo/mui-native/blob/main/LICENSE), Copyright (c) 2026 Altroo and contributors. This package includes `LICENSE` and `NOTICE`; adapted upstream code retains its original notices. See [upstream attribution](https://github.com/Altroo/mui-native/blob/main/NOTICE).
