# @altroo/mui-native-system

Native theme and styling foundations for MUI Native. Experimental pre-alpha.

**Pre-alpha preview.** Expect incomplete APIs and breaking changes. This is an independent Altroo project, not an official or endorsed MUI product. Pro/Premium source and paid-only feature parity are excluded.

## Install

```sh
npm install @altroo/mui-native-system@prealpha
```

The matched development baseline is React 19.3 / React Native 0.88.1 (Expo SDK 58). Review the [installation guide](https://github.com/Altroo/mui-native/blob/main/docs/installation.md) before using another runtime. Keep `@altroo/mui-native-host` as a direct application dependency when using Material or X components. Rebuild the native application after installing/updating native code; Expo Go does not contain these hosts.

## Android system fonts in source development

The unpublished source after `0.0.7-prealpha.0` routes Android CSS-derived platform-default sans-serif fonts through an internal alias registered by the matching rebuilt `@altroo/mui-native-host`. Keep that host as a direct Android application dependency even when rendering with System alone. A JavaScript reload or Expo Go cannot install the registration. Without the rebuilt host, the alias follows React Native's ordinary unregistered-family fallback. The renderless `DefaultPropsProvider` and `RtlProvider` entries and the canonical `createBreakpoints` helper entry do not require or initialize a native renderer or host.

React Native applies exact numeric Typeface weights on Android 28 and later; Android 24-27 retain its native normal/bold fallback. The stock MUI font stack and CSS default-family aliases select the internal Android font, while stored theme values and iOS mapping remain unchanged.

Application font registrations, assets and genuine native inline names, including literal `System`, keep their existing meaning. Quoted custom CSS names remain literal on Android. Only the `__AltrooMUI` font namespace is reserved for internal defaults. See the [installation guide](https://github.com/Altroo/mui-native/blob/main/docs/installation.md#android-system-fonts-in-source-development).

## Current scope

Theme tokens/providers, palette, typography, spacing, breakpoints and supported native styling. Complete MUI System/CSS semantics are not implemented.

See the [component status](https://github.com/Altroo/mui-native#status), [compatibility contract](https://github.com/Altroo/mui-native/blob/main/docs/compatibility.md) and [package guide](https://github.com/Altroo/mui-native/blob/main/docs/compatibility.md). Scoped emulator tests and type checks do not certify full physical-device, accessibility or release-performance behavior.

## License

Original code is [MIT licensed](https://github.com/Altroo/mui-native/blob/main/LICENSE), Copyright (c) 2026 Altroo and contributors. This package includes `LICENSE` and `NOTICE`; adapted upstream code retains its original notices. See [upstream attribution](https://github.com/Altroo/mui-native/blob/main/NOTICE).
