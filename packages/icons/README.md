# @altroo/mui-native-icons

Experimental native SVG icons for MUI Native.

**Pre-alpha preview.** Expect incomplete APIs and breaking changes. This is an independent Altroo project, not an official or endorsed MUI product. Pro/Premium source and paid-only feature parity are excluded.

## Install

```sh
npm install @altroo/mui-native-icons@prealpha @altroo/mui-native-host@prealpha
```

The matched development baseline is React 19.3 / React Native 0.88.1 (Expo SDK 58). Review the [installation guide](https://github.com/Altroo/mui-native/blob/main/docs/installation.md) before using another runtime. Keep `@altroo/mui-native-host` as a direct application dependency when using Material or X components. Rebuild the native application after installing/updating native code; Expo Go does not contain these hosts.

Charts/icons also need `react-native-svg` as a direct app dependency. In the matched Expo app, run `npx expo install react-native-svg`, then rebuild.

## Current scope

Four original geometric icons: Add, Check, Close and Remove. Source development after `0.0.7-prealpha.0` shares Material SvgIcon styling, refs and its React-node factory while retaining the early path-string extension. See [the SVG guide](https://github.com/Altroo/mui-native/blob/main/docs/svg-icon.md). The full upstream icon set is not implemented.

See the [component status](https://github.com/Altroo/mui-native#status), [compatibility contract](https://github.com/Altroo/mui-native/blob/main/docs/compatibility.md) and [package guide](https://github.com/Altroo/mui-native/blob/main/docs/coverage.md). Scoped emulator tests and type checks do not certify full physical-device, accessibility or release-performance behavior.

## License

Original code is [MIT licensed](https://github.com/Altroo/mui-native/blob/main/LICENSE), Copyright (c) 2026 Altroo and contributors. This package includes `LICENSE` and `NOTICE`; adapted upstream code retains its original notices. See [upstream attribution](https://github.com/Altroo/mui-native/blob/main/NOTICE).
