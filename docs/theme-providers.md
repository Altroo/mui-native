# Native theme providers and scopes

Material and System now have separate provider/hook entry points backed by one shared native context. The implementation follows the pinned non-CSS-variable MUI 9.5.0 composition rules.

```tsx
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({ palette: { mode: 'dark' } });

<ThemeProvider theme={theme}>
  <ThemeProvider theme={{ direction: 'rtl' }}>{/* app */}</ThemeProvider>
</ThemeProvider>;
```

Nested objects shallow-merge top-level keys. The child above retains palette, spacing and component settings. Supplying a new palette or components object replaces that entire top-level object; nested providers do not deep-merge it. Create a complete theme first when replacing palette tokens. Provider inputs are not mutated.

A callback receives the outer theme and replaces it with its return value. Extend explicitly when retaining outer fields:

```tsx
<ThemeProvider theme={(outer) => ({ ...outer, direction: 'rtl' })} />
```

Inject an outer object before using a callback. A root callback receives an empty object, rather than an automatically completed default theme; missing-outer use emits a native diagnostic. Native providers evaluate a callback once per memoized resolution, rather than separately for two browser styling engines. Keep callbacks pure, and replace theme objects instead of mutating them. Changed outer themes propagate to nested callbacks and consumers; unrelated rerenders with stable theme inputs reuse the resolved value.

## Sharing an application with another design system

```tsx
import SystemThemeProvider from '@mui/system/ThemeProvider';
import { ThemeProvider, THEME_ID, createTheme } from '@mui/material/styles';

const material = createTheme({ palette: { primary: { main: '#245c50' } } });

<SystemThemeProvider theme={{ application: 'example' }}>
  <ThemeProvider theme={{ [THEME_ID]: material }}>{/* Material UI */}</ThemeProvider>
</SystemThemeProvider>;
```

THEME_ID is the upstream public `$$material` identifier. System useTheme returns the raw theme envelope; Material useTheme selects the Material scope when present. Material components, Box, native styling helpers, icons and the existing X renderers use that selection. Their overrides and sx callbacks receive the selected theme too. Icon packages now depend on the native Material package for this shared hook, with no browser dependency.

System ThemeProvider accepts themeId for arbitrary scopes. Object scope values replace the selected scope, while preserving other outer keys. A scoped callback receives the existing scope, falling back to the outer envelope when the scope is absent; that missing-scope use emits a diagnostic. Default-prop and direction contexts follow the provider's selected scope. Consequently a nested provider for a different design system can replace the active default map even while Material token lookup still selects the retained Material scope, matching the reference behavior.

Material object themes activate scoping with `{ [THEME_ID]: theme }`. A Material callback receives the raw engine envelope; it does not automatically select an existing Material scope. When extending an existing scope, use System ThemeProvider with themeId={THEME_ID} and return the updated selected theme, or explicitly return an updated envelope. These behaviors have distinct pinned reference cases.

System and Material useThemeProps read their respective theme selection, independently of standalone DefaultPropsProvider overrides. The provider supplies the selected theme's component map; nested component maps replace rather than deep-merge their outer maps. See [default props](default-props.md).

## Hooks and imports

The native resolver supports @mui/system/ThemeProvider, useTheme, useThemeWithoutDefault and RtlProvider. Material style imports include styles, styles/ThemeProvider, styles/useTheme, styles/useThemeProps, styles/identifier and styles/styled. Existing root imports remain available. Root/deep entries share the same implementations and context. Generic provider props and generic theme hooks work in installed consumers; Material ThemeProvider exposes no System themeId prop. System useTheme also exports its systemDefaultTheme singleton. Material useThemeProps preserves the three generic parameters and ThemeWithProps/ThemedProps helpers, including props inferred from component defaults.

useThemeWithoutDefault returns null outside a nonempty provider, or a supplied fallback. An empty System theme resolves through the hook fallback. The native default theme remains Material-shaped; this increment does not complete a separate System createTheme/default-token contract.

RtlProvider and useRtl preserve the reference context defaults: the hook is false without a provider, an omitted provider value means true, and explicit false wins. ThemeProvider supplies the selected theme's direction. This context does not change the device's global layout direction. Physical RTL, font scaling, screen-reader order and device geometry still require native validation.

## Evidence and remaining work

Run `node scripts/reference/theme-providers.mjs --check` after the isolated [reference setup](theming.md). It checks npm integrity, selected source bytes and MIT identity before comparing 20 provider/hook/default/direction cases. Native regressions add dynamic outer updates, memoized callbacks, sibling isolation, scoped components/styles, icons and X Charts. A fresh installed consumer checks all new original paths, native generic types and unsupported browser props. No actual device, screen reader or release performance result follows from these component checks.

CSS variables, colorSchemes switching, browser storage/persistence/SSR styling, DOM cascade layers and full styled/CSS semantics remain unfinished. The preserved vars:null no-vars marker does not implement a CSS-variable engine. The provider accepts partial objects for composition; rendering a Material component still requires a complete usable Material theme. No new external runtime dependency, upstream verified-support promotion or npm publication is included.
