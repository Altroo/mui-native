# @altroo/mui-native

Experimental React Native compatibility for Material UI.

**Pre-alpha preview.** Expect incomplete APIs and breaking changes. This is an independent Altroo project, not an official or endorsed MUI product. Pro/Premium source and paid-only feature parity are excluded.

## Install

```sh
npm install @altroo/mui-native@latest @altroo/mui-native-host@latest
```

The matched development baseline is React 19.3 / React Native 0.88.1 (Expo SDK 58). Review the [installation guide](https://github.com/Altroo/mui-native/blob/main/docs/installation.md) before using another runtime. Keep `@altroo/mui-native-host` as a direct application dependency when using Material or X components. Rebuild the native application after installing/updating native code; Expo Go does not contain these hosts.

## Example

```tsx
import { Button, ThemeProvider, createTheme } from '@altroo/mui-native';

const theme = createTheme();

export function Example() {
  return (
    <ThemeProvider theme={theme}>
      <Button variant="contained" onClick={() => console.log('Pressed')}>
        Continue
      </Button>
    </ThemeProvider>
  );
}
```

Starting with `0.0.8-prealpha.0`, Material includes native SvgIcon and requires `react-native-svg` as a direct application dependency. See [the SVG guide](https://github.com/Altroo/mui-native/blob/main/docs/svg-icon.md). Install it in the matched Expo application with `npx expo install react-native-svg`, then rebuild.

## Current scope

Native implementations of selected Material components. APIs and behavior are partial; this is not a drop-in replacement for Material UI.

See the [component status](https://github.com/Altroo/mui-native#status), [compatibility contract](https://github.com/Altroo/mui-native/blob/main/docs/compatibility.md) and [package guide](https://github.com/Altroo/mui-native/blob/main/docs/compatibility.md). Scoped emulator tests and type checks do not certify full physical-device, accessibility or release-performance behavior.

Starting with `0.0.7-prealpha.0`, this preview includes Autocomplete, its headless hook and native Collapse. See the [Autocomplete guide](https://github.com/Altroo/mui-native/blob/main/docs/autocomplete.md) and [Collapse guide](https://github.com/Altroo/mui-native/blob/main/docs/collapse.md) for usage, mapped/multiple values, transitions, slots and remaining native gates. Upgrade the matching native-host package and rebuild the application; the earlier preview binary does not include the managed native editor.

## License

Original code is [MIT licensed](https://github.com/Altroo/mui-native/blob/main/LICENSE), Copyright (c) 2026 Altroo and contributors. This package includes `LICENSE` and `NOTICE`; adapted upstream code retains its original notices. See [upstream attribution](https://github.com/Altroo/mui-native/blob/main/NOTICE).
