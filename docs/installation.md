# Installation during pre-alpha development

No npm release exists. Start with the repository catalog, or build and pack local tarballs for a disposable Expo SDK 58 / React Native 0.88.1 application.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm pack:all
```

Install the generated system, material and native-host archives together in the consumer. Add the compatibility archive if retaining original imports, and only the X/icon archives you need. X archives depend on the material and system packages, so pass all local archives together to the package manager. Install React 19.3.0 / React Native 0.88.1 peers. Charts/icons also require `react-native-svg` 15.16.0; use `npx expo install react-native-svg` in a matched Expo app. The grid archive carries FlashList, and the date archive carries Day.js.

```sh
npm install /absolute/path/artifacts/packages/altroo-mui-native-system-0.0.0-dev.0.tgz \
  /absolute/path/artifacts/packages/altroo-mui-native-0.0.0-dev.0.tgz \
  /absolute/path/artifacts/packages/altroo-mui-native-host-0.0.5-dev.0.tgz \
  /absolute/path/artifacts/packages/altroo-mui-native-compat-0.0.0-dev.0.tgz
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

Generate a native TypeScript configuration in the application root, after building the packages:

```sh
node -e "console.log(JSON.stringify(require('@altroo/mui-native-compat').createNativeTsconfig(), null, 2))" > tsconfig.native.json
npx tsc --project tsconfig.native.json --noEmit
```

Keep the existing web tsconfig separate and install the original `@mui/*` packages in the web application. TypeScript aliases do not configure Metro by themselves. Do not alias every `@mui/*` import globally. Only implemented public subpaths are mapped; commercial and internal imports are rejected on native.

Use the catalog as a setup reference. An npm installation guide with alpha versions will replace tarball paths after verified alpha and namespace ownership checks. React Native peer ranges will only broaden after matrix validation.

SDK 58 uses React Native's strict public TypeScript API. Native refs use `ViewInstance` and `TextInputInstance`; DOM refs are incompatible. The generated native tsconfig selects the `react-native` condition. Keep `skipLibCheck: true`, as recommended by the [React Native migration guide](https://reactnative.dev/docs/strict-typescript-api), because upstream generated declarations contain internal errors. The consumer fixture still checks component usage, native refs, theme augmentation and rejection of unsupported imports.

Native [Select and TextField select](select.md) use the same material/system/host archives and native rebuild requirement as Menu. They add no picker or web-runtime dependency. For platform-native selection, use option/optgroup configuration with [NativeSelect or Select native](native-select.md). The changed presentation acknowledgement protocol requires native-host 0.0.2-dev.0 and a native rebuild. Use MenuItem children with the default Select branch.

Button and IconButton now use the native ButtonBase host as well. Rebuild an application that previously used only their stock Pressable implementation; Expo Go cannot render these controls. See [native buttons](button.md) for native event/ref and custom-root migration.

Checkbox and Radio also use the native ButtonBase host. Rebuild apps that previously used their stock Pressable implementation. See [checked controls](check-controls.md) for native input handles, slots, group/label behavior and migration boundaries.

Switch now requires the same native interaction host and native build. See [Switch](switch.md) for five-slot composition, event migration and native refs.

[Native Popper](popper.md) requires native-host 0.0.5-dev.0 and a native application rebuild for its containing-frame, arrow and explicit-boundary observation protocol. JavaScript refreshes cannot upgrade an older host. Its root/deep imports use the same compatibility resolver as the other Material components.
