# @altroo/mui-native-x-date-pickers

Experimental native date picker compatibility for MUI X Community.

**Pre-alpha preview.** Expect incomplete APIs and breaking changes. This is an independent Altroo project, not an official or endorsed MUI product. Pro/Premium source and paid-only feature parity are excluded.

## Install

```sh
npm install @altroo/mui-native-x-date-pickers@prealpha @altroo/mui-native-host@prealpha
```

The matched development baseline is React 19.3 / React Native 0.88.1 (Expo SDK 58). Review the [installation guide](https://github.com/Altroo/mui-native/blob/main/docs/installation.md) before using another runtime. Keep `@altroo/mui-native-host` as a direct application dependency when using Material or X components. Rebuild the native application after installing/updating native code; Expo Go does not contain these hosts.

## Current scope

Day.js date fields, calendar and dialog-picker prototypes. Time/date-time, additional adapters and complete picker event behavior are not implemented.

See the [component status](https://github.com/Altroo/mui-native#status), [compatibility contract](https://github.com/Altroo/mui-native/blob/main/docs/compatibility.md) and [package guide](https://github.com/Altroo/mui-native/blob/main/docs/compatibility.md). Scoped emulator tests and type checks do not certify full physical-device, accessibility or release-performance behavior.

## License

Original code is [MIT licensed](https://github.com/Altroo/mui-native/blob/main/LICENSE), Copyright (c) 2026 Altroo and contributors. This package includes `LICENSE` and `NOTICE`; adapted upstream code retains its original notices. See [upstream attribution](https://github.com/Altroo/mui-native/blob/main/NOTICE).
