# Installation during pre-alpha development

No npm release exists. Start with the repository catalog, or build and pack local tarballs for a disposable Expo SDK 57 / React Native 0.86.3 application.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm pack:all
```

Install the generated system and material archives together in the consumer. Add the compatibility archive if retaining original imports, and only the X/icon archives you need. X archives depend on the material and system packages, so pass all local archives together to the package manager. Install React 19.2.3 / React Native 0.86.3 peers. Charts/icons also require `react-native-svg` 15.15.4; use `npx expo install react-native-svg` in a matched Expo app. The grid archive carries FlashList, and the date archive carries Day.js.

```sh
npm install /absolute/path/artifacts/packages/altroo-mui-native-system-0.0.0-dev.0.tgz \
  /absolute/path/artifacts/packages/altroo-mui-native-0.0.0-dev.0.tgz \
  /absolute/path/artifacts/packages/altroo-mui-native-compat-0.0.0-dev.0.tgz
```

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
