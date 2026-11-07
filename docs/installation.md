# Installation during pre-alpha development

Use the explicit `prealpha` dist-tag for this experimental preview in a disposable/development Expo SDK 58 / React Native 0.88.1 application. APIs and behavior are incomplete; native builds, full physical-device matrices and calibrated performance are not certified by publication.

```sh
npm install @altroo/mui-native@prealpha @altroo/mui-native-host@prealpha
```

Keep the host as a direct native app dependency for autolinking. If retaining supported original MUI imports, also install `@altroo/mui-native-compat@prealpha`. Rebuild with `npx expo run:ios` or `npx expo run:android`; Expo Go cannot load the custom native hosts. For a bare React Native app, rebuild its native projects normally after installing dependencies/pods.

Optional packages use the same tag:

- `@altroo/mui-native-icons@prealpha` and `@altroo/mui-native-x-charts@prealpha`: install `react-native-svg` directly with `npx expo install react-native-svg` in the matched Expo app, then rebuild.
- `@altroo/mui-native-x-data-grid@prealpha`: install `@shopify/flash-list@2.3.2` directly for native autolinking, then rebuild.
- `@altroo/mui-native-x-tree-view@prealpha` and `@altroo/mui-native-x-date-pickers@prealpha`: reuse the Material/system/host foundation; the date package carries Day.js.

Pinned preview version: `0.0.7-prealpha.0` for all nine packages. Explicit native imports work after installation; original `@mui/...` imports also need the Metro and TypeScript configuration below.

## Upgrade from 0.0.6-prealpha.0

Install the matching `0.0.7-prealpha.0` versions of every `@altroo/mui-native*` package used by the application, including the direct native-host dependency. This preview adds the managed native text editor used by Material inputs and Autocomplete. **Rebuild the iOS/Android application** after upgrading; a JavaScript reload cannot add its Fabric component. Expo Go cannot run these hosts.

The native editor adapter requires **React Native 0.88.1** in both JavaScript and the application binary. Its peer/source guards intentionally reject unreviewed ABIs. Keep React 19.3.0 and the matched Expo SDK 58 baseline, then perform the usual native dependency installation/build. Do not bypass a missing-descriptor or peer-source mismatch error; follow its generated-cache/rebuild guidance in [the native-host guide](native-host.md#native-text-editor).

## Android system fonts in source development

The unpublished source after `0.0.7-prealpha.0` routes Android CSS-derived platform-default sans-serif fonts through a private library alias registered during native-host package construction. Native default-font rendering needs the matching `@altroo/mui-native-host` as a direct application dependency and an Android rebuild, including applications using System without Material or X. Without that rebuilt host, the alias follows React Native's ordinary unregistered-family normal/bold fallback. The renderless `DefaultPropsProvider` and `RtlProvider` entries and the canonical `createBreakpoints` helper entry still work without initializing the native renderer or host.

React Native applies exact numeric Typeface weights on Android 28 and later; Android 24-27 retain its native normal/bold fallback. The actual stock MUI font stack and CSS platform-default names map to the internal Android alias. An explicit CSS default-font value remains an effective reset inside a custom-font paragraph; it is never omitted in favor of inheriting that paragraph's font.

The registration does not use or shadow the public `System` name, app assets or other custom families. Genuine native inline font names and quoted custom CSS names retain their meaning; stored theme font stacks and iOS mapping are unchanged. Reserve the `__AltrooMUI` font namespace for library internals.

## Build local archives instead

To test source changes before a registry release, build and pack local tarballs:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm pack:all
```

Install the generated system, material and native-host archives together in the consumer. Add the compatibility archive if retaining original imports, and only the X/icon archives you need. X archives depend on the material and system packages, so pass all local archives together to the package manager. Install React 19.3.0 / React Native 0.88.1 peers. Source development after `0.0.7-prealpha.0` also requires `react-native-svg` 15.16.0 for Material SvgIcon; the published preview requires it for charts/icons. Install it directly in the consumer; use `npx expo install react-native-svg` in a matched Expo app. The grid archive carries FlashList, and the date archive carries Day.js.

```sh
npm install /absolute/path/artifacts/packages/altroo-mui-native-system-0.0.7-prealpha.0.tgz \
  /absolute/path/artifacts/packages/altroo-mui-native-0.0.7-prealpha.0.tgz \
  /absolute/path/artifacts/packages/altroo-mui-native-host-0.0.7-prealpha.0.tgz \
  /absolute/path/artifacts/packages/altroo-mui-native-compat-0.0.7-prealpha.0.tgz
```

Keep `@altroo/mui-native-host` as a direct native application dependency for autolinking. Rebuild the native application after installing it or updating native host source/schema. The descendant Tab/Escape bridge also needs that rebuild; a JavaScript reload is insufficient. Expo Go does not contain the Fabric interaction host required by interactive rows and Modal/Dialog/Popover/Menu. Use an Expo development build (`npx expo run:ios` or `npx expo run:android`) or the application's existing bare React Native native build. Existing controls have not all been migrated to the host. See [native host setup and custom roots](native-host.md).

For explicit native imports, use `@altroo/mui-native` and the separate X packages. For shared application source that retains `@mui/...`, configure Metro:

```js
// metro.config.cjs in an Expo application
const { getDefaultConfig } = require('expo/metro-config');
const { withMuiNative } = require('@altroo/mui-native-compat/metro');
module.exports = withMuiNative(getDefaultConfig(__dirname));
```

For bare React Native, wrap `getDefaultConfig(__dirname)` from `@react-native/metro-config` the same way. Do not overwrite an existing resolver; the wrapper delegates to it.

Generate a native TypeScript configuration in the application root after installing the packages (or building local archives):

```sh
node -e "console.log(JSON.stringify(require('@altroo/mui-native-compat').createNativeTsconfig(), null, 2))" > tsconfig.native.json
npx tsc --project tsconfig.native.json --noEmit
```

Keep the existing web tsconfig separate and install the original `@mui/*` packages in the web application. TypeScript aliases do not configure Metro by themselves. Do not alias every `@mui/*` import globally. Only implemented public subpaths are mapped; commercial and internal imports are rejected on native.

Use the catalog as a setup reference. The `prealpha` tag is an early preview channel; verified alpha/stable releases require the roadmap gates. Local archives remain available for unpublished source changes. React Native peer ranges will only broaden after matrix validation.

SDK 58 uses React Native's strict public TypeScript API. Native refs use `ViewInstance` and `TextInputInstance`; DOM refs are incompatible. The generated native tsconfig selects the `react-native` condition. Keep `skipLibCheck: true`, as recommended by the [React Native migration guide](https://reactnative.dev/docs/strict-typescript-api), because upstream generated declarations contain internal errors. The consumer fixture still checks component usage, native refs, theme augmentation and rejection of unsupported imports.

Native [Select and TextField select](select.md) use the same material/system/host archives and native rebuild requirement as Menu. They add no picker or web-runtime dependency. For platform-native selection, use option/optgroup configuration with [NativeSelect or Select native](native-select.md). The public preview includes the presentation acknowledgement protocol; a native rebuild is required. Use MenuItem children with the default Select branch.

Button and IconButton now use the native ButtonBase host as well. Rebuild an application that previously used only their stock Pressable implementation; Expo Go cannot render these controls. See [native buttons](button.md) for native event/ref and custom-root migration.

Checkbox and Radio also use the native ButtonBase host. Rebuild apps that previously used their stock Pressable implementation. See [checked controls](check-controls.md) for native input handles, slots, group/label behavior and migration boundaries.

Switch now requires the same native interaction host and native build. See [Switch](switch.md) for five-slot composition, event migration and native refs.

[Native Popper](popper.md) requires the matching published native-host package and a native application rebuild for its containing-frame, arrow and explicit-boundary observation protocol. JavaScript refreshes cannot upgrade an older host. Its root/deep imports use the same compatibility resolver as the other Material components.
