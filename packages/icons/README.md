# @altroo/mui-native-icons

Experimental native SVG icons for MUI Native.

**Unpublished development after `0.0.7-prealpha.0`.** The full catalog and new-icon examples below apply to development source and have not been published to npm. The released `0.0.7-prealpha.0` preview contains only the four prototype glyphs Add, Check, Close and Remove.

**Pre-alpha preview.** Expect incomplete APIs and breaking changes. This is an independent Altroo project, not an official or endorsed MUI product. Pro/Premium source and paid-only feature parity are excluded.

## Install

```sh
npm install @altroo/mui-native-icons@prealpha @altroo/mui-native-host@prealpha
```

The matched development baseline is React 19.3 / React Native 0.88.1 (Expo SDK 58). Review the [installation guide](https://github.com/Altroo/mui-native/blob/main/docs/installation.md) before using another runtime. Keep `@altroo/mui-native-host` as a direct application dependency when using Material or X components. Rebuild the native application after installing/updating native code; Expo Go does not contain these hosts.

Charts/icons also need `react-native-svg` as a direct app dependency. In the matched Expo app, run `npx expo install react-native-svg`, then rebuild.

## Current scope

**Development scope, not yet published:** all **10,750 icon exports** from the pinned `@mui/icons-material` 9.5.0 package are generated from its integrity-checked source archive. The supplied Filled, Outlined, Rounded, Sharp and TwoTone names, legacy aliases and single-style icons are retained exactly. Missing sibling variants are not invented. Generated artwork shares native Material SvgIcon styling, accessibility props, refs and viewBox behavior. The early root `createSvgIcon(pathString, name)` extension remains available.

Prefer a direct import for bounded startup:

```tsx
import Add from '@altroo/mui-native-icons/Add';
import AccessAlarmTwoTone from '@altroo/mui-native-icons/AccessAlarmTwoTone';
// With the native compatibility resolver:
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
```

Named root imports are also supported. The published ESM build permits unused glyphs to be removed by bundlers that perform tree shaking. Metro configurations may eagerly initialize the full root barrel, so root imports do not promise the startup or memory cost of a direct import. A deep icon module imports only React and the shared factory, never the full catalog. CommonJS, ESM and native source conditions expose the same names.

Geometry is checked against every original module. Native rendering uses the existing SvgIcon/react-native-svg backend; complete catalog generation does not certify every glyph's physical-device rendering or screen-reader behavior. See [the SVG guide](https://github.com/Altroo/mui-native/blob/main/docs/svg-icon.md).

## Regeneration

From the repository root, place the reviewed original archive at `.cache/upstream/icons-material-9.5.0.tgz`, then run:

```sh
node scripts/icons/generate.mjs
node scripts/icons/generate.mjs --check
node --test scripts/icons/catalog.test.mjs
node scripts/icons/build.mjs
```

Generation is offline. It checks the pinned archive integrity, package identity, declaration inventory and license hashes before translating the complete public catalog. Unknown SVG primitives or source expressions stop generation. Edit the generator rather than generated modules. `upstream/material-icons.json` records source and generated hashes.

See the [component status](https://github.com/Altroo/mui-native#status), [compatibility contract](https://github.com/Altroo/mui-native/blob/main/docs/compatibility.md) and [package guide](https://github.com/Altroo/mui-native/blob/main/docs/coverage.md). Scoped emulator tests and type checks do not certify full physical-device, accessibility or release-performance behavior.

## License

Native code is [MIT licensed](https://github.com/Altroo/mui-native/blob/main/LICENSE), Copyright (c) 2026 Altroo and contributors. This package includes `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md` and `LICENSE.material-icons`; the MIT wrapper notice and Apache-2.0 artwork attribution are retained. See [upstream attribution](https://github.com/Altroo/mui-native/blob/main/NOTICE).
