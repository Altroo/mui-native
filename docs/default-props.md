# Theme defaults and slot props

Native Material components read `theme.components.MuiName.defaultProps` through a shared default-prop context. Caller values take precedence; explicit `undefined` receives a default, while `null`, `false`, zero and empty strings remain explicit. Default objects and supplied props are not mutated.

```tsx
import { createTheme, ThemeProvider, TextField } from '@mui/material';

const theme = createTheme({
  components: {
    MuiTextField: {
      defaultProps: {
        size: 'small',
        slotProps: { htmlInput: { placeholder: 'Name', autoCapitalize: 'words' } },
      },
    },
  },
});

<ThemeProvider theme={theme}>
  <TextField
    label="Customer"
    slotProps={{
      htmlInput: (state) => ({ selectionColor: state.focused ? '#0274d7' : '#64748b' }),
    }}
  />
</ThemeProvider>;
```

The supplied input slot keeps the theme's placeholder and capitalization. TextField supports object or owner-state callbacks for `root`, `input`, `htmlInput`, `inputLabel` and `formHelperText`. Callbacks run at rendering with resolved props, form flags and focus state. Both sides remain deferred when theme and caller provide callbacks. Native input aliases, managed value/change behavior and the existing event order still apply.

## Merge rules

`slots` and legacy `components` merge their named entries. `slotProps` and legacy `componentsProps` fill defaults within each named slot; callbacks receive the same arguments when their results are merged. Other object props, including `sx`, replace their defaults. Default resolution replaces event handlers rather than composing them.

By default, a supplied `style` or `className` replaces its default. Set `components.mergeClassNameAndStyle: true` to merge them. Native styles preserve ordered arrays and Pressable callbacks, with caller styles last. This deliberately uses React Native style semantics instead of spreading array indices into a CSS object. Class-name concatenation is useful for custom roots; it does not introduce a native CSS class engine.

Default resolution is connected to the existing Material layout, form/control, feedback, Button/IconButton and Typography components. Box retains its existing System behavior and does not gain MuiBox default-prop support. Each component still implements only its documented prop subset; a default cannot enable an unimplemented API. TextField component replacement is documented in [native input slots](textfield-slots.md); other component slot mounting remains unfinished.

## Providers and hooks

`DefaultPropsProvider` and `useDefaultProps` are available through `@mui/material/DefaultPropsProvider` and `@mui/system/DefaultPropsProvider`. Native root aliases remain available; Material's deep forwarding functions are distinct while sharing System context. A nested provider replaces the default map; the System provider accepts `value={undefined}` to reset it. See the [finite provider contract](default-props-provider.md) for public types, default selection, aliases and adaptation boundaries. `ThemeProvider` supplies its theme's component map automatically. A standalone default provider does not modify theme tokens or style overrides.

`useThemeProps` remains a System theme lookup and supports `defaultTheme` plus an explicit `themeId`. `getThemeProps` applies a component's `defaultProps` directly. These helpers are available through original root/style imports and `@mui/system/useThemeProps`. System helpers do not consume an independent DefaultPropsProvider override or the Material style-merge flag. Default provider hooks also support MUI's raw configuration form where no defaultProps/styleOverrides/variants wrapper is present.

Nested objects, callback replacement and scoped native providers are documented in [theme providers](theme-providers.md). Material useThemeProps now selects its Material scope and preserves the upstream ThemeWithProps/ThemedProps generic contract; System hooks retain explicit themeId/defaultTheme lookup. CSS-variable/color-scheme providers and remaining styling APIs remain unfinished.

## Explicit slot composition

`mergeSlotProps` is available from `@mui/material/utils` and the native Material root. It merges slot props explicitly: external values win, class names concatenate, native styles compose, and `sx` arrays place defaults before external styles. When both define an `onX` handler, the external handler runs first and the default handler runs second. Event cancellation does not skip the default handler, matching the pinned utility.

For callback slots, the default callback receives owner state; the external callback receives owner state extended with the default slot values. This differs from theme-default callback resolution, where both callbacks receive the original owner state. Absent callback results resolve safely to empty props. The helper does not merge refs or implement slot mounting; consumers remain responsible for using native slot components and supported props.

## Evidence and maintenance

The reference fixture covers 20 default cases, four deferred callback combinations and four explicit slot-merge combinations against Material UI/System/Utils 9.5.0. The reference generator verifies npm integrity, license hashes and executed source bytes. Use the isolated setup in [theming](theming.md), then run `node scripts/reference/default-props.mjs --check`. Normal tests use committed data.

The MIT Utils package is a pinned supporting source dependency, with its own immutable API/license record and upstream monitoring. It helps resolve declaration re-exports; it does not create an `@mui/utils` native alias, a separate runtime package or a verified-support claim. Existing package baselines remain unchanged. The complete transitive dependency/license audit is still open.

Runtime packages preserve shared internal modules rather than bundling a separate context for each entry point. Installed export-identity checks verify that root/deep providers, hooks and Material components share their implementations; this check uses a minimal native-module stub and does not establish device rendering.

Installed-consumer checks cover all new original import paths, typed owner-state callbacks, provider values, slot utilities and invalid native prop rejection. Native interaction, accessibility, RTL, font scaling, crashes and release performance retain their device-validation gates.
