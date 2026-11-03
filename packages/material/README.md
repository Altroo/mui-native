# @altroo/mui-native

Experimental React Native compatibility for Material UI.

**Pre-alpha preview.** Expect incomplete APIs and breaking changes. This is an independent Altroo project, not an official or endorsed MUI product. Pro/Premium source and paid-only feature parity are excluded.

## Install

```sh
npm install @altroo/mui-native@prealpha @altroo/mui-native-host@prealpha
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

## Current scope

Native implementations of selected Material components. APIs and behavior are partial; this is not a drop-in replacement for Material UI.

See the [component status](https://github.com/Altroo/mui-native#status), [compatibility contract](https://github.com/Altroo/mui-native/blob/main/docs/compatibility.md) and [package guide](https://github.com/Altroo/mui-native/blob/main/docs/compatibility.md). Scoped emulator tests and type checks do not certify full physical-device, accessibility or release-performance behavior.

Autocomplete and its headless hook are implemented in the current source. Published `0.0.6-prealpha.0` packages predate this addition. See the [Autocomplete guide](https://github.com/Altroo/mui-native/blob/main/docs/autocomplete.md) for source-build usage, mapped/multiple values, renderers, slots and remaining native gates.

## License

Original code is [MIT licensed](https://github.com/Altroo/mui-native/blob/main/LICENSE), Copyright (c) 2026 Altroo and contributors. This package includes `LICENSE` and `NOTICE`; adapted upstream code retains its original notices. See [upstream attribution](https://github.com/Altroo/mui-native/blob/main/NOTICE).
