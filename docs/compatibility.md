# Compatibility contract

The [generated declaration inventory](coverage.md) records baseline imports, export origins and direct contract members. It does not establish parity; unresolved dependencies and inherited contracts remain explicit gaps.

Current status: prototypes. All implemented components are **adapted subsets**, not exact equivalents. `upstream/state.json` deliberately leaves `portedAndVerified` and `releasedSupport` empty.

## Currently exercised

- Shallow nested themes, callback replacement, System scopes, Material THEME_ID selection, shared original imports and RTL context. See [theme providers](theme-providers.md).

- Dedicated FormLabel/InputLabel/FormHelperText contracts, floating/stacked fields, scoped focus/name/helper links and reduced-motion-aware native transforms. See [forms and labels](form-labels.md).
- InputBase/Input/FilledInput/OutlinedInput, adornments, native row bounds and coordinated form state. See [native inputs](inputs.md) for the implemented subset and native differences.
- TextField replacement of five native slots, distinct input-container and editable-host contracts, composed refs and React 19 cleanup. See [native input slots](textfield-slots.md).
- Theme/default-prop contexts, named slot default merging, TextField owner-state callbacks and explicit slot prop composition. See [defaults](default-props.md) for replacement rules and native differences.

- MUI-shaped typography themes, callbacks/conversion, native text normalization, custom variants, heading mapping and tracked text inheritance. See [typography](typography.md) for native differences and explicit limits.

- Object, function, and array `sx`; palette paths; spacing; fractional sizing; `px`/`rem`; responsive values; selected `&.Mui-state` selectors; root overrides and variants.
- Spacing arrays/functions/strings and multi-value helpers, breakpoint methods and custom keys, native width media rules, responsive Stack spacing and Dialog widths. See [layout system](layout-system.md) for supported units, ordering and limitations.
- Palette shade/contrast derivation, light/dark defaults, augmentColor, color helpers and Palette/PaletteOptions augmentation. See [native theming](theming.md) for tested inputs and limitations.
- Button loading positions, custom indicators, disabled presses and native busy state. See [native Button loading](button.md); screen-reader behavior remains unverified.
- Controlled/uncontrolled form state, value/name change adapters, disabled buttons, native handler precedence, checkbox/radio selection.
- Native modal backdrop and Android back-request close reasons; snackbar timeout cleanup.
- Optional native grid cards, automatic switching at 600 dp of container width, explicit table mode and application-composed card content. See [native grid layouts](adaptive-grid.md).
- Grid identity validation, single-column sorting/filtering, fixed-width columns, page size up to 100, include/exclude selection models. Row recycling uses FlashList. Server-mode inputs remain application-owned.
- Rich tree expansion and selection, including validation of duplicate IDs in collapsed branches.
- Bar/line chart numeric values, null gaps, basic categorical labels, item callbacks.
- Strict Day.js field parsing, partial invalid text, calendar-day bounds and named timezone parsing. DatePicker currently publishes calendar selection when the user accepts, which differs from upstream live-selection callback timing.

## Unsupported or not yet verified

Do not assume unlisted props work. Public TypeScript interfaces describe the implemented subset. JavaScript callers should run migration diagnostics and review source usage before adoption.

- Full Material UI export coverage, all icon variants, remaining component slot replacement, classes/className, arbitrary CSS, CSS variables, non-width media queries, arbitrary descendant selectors, browser refs/events, transitions, ripple behavior.
- Full `styled` semantics, CSS-variable/color-scheme providers, complete typography inheritance, the full responsive/style utility export set, all upstream augmentation interfaces. The installed-consumer fixture verifies custom Theme, ThemeOptions, Palette, PaletteOptions and BreakpointOverrides augmentation through @mui/material/styles.
- Nested modal/focus restoration, keyboard avoidance on all devices, VoiceOver/TalkBack workflows, RTL and large-font layouts.
- Grid cell editing, column virtualization, apiRef, column menus, flexible/dynamic sizing, keyboard navigation, comprehensive filtering operators and callback detail arguments.
- SimpleTreeView/TreeItem composition, complete tree apiRef, all Community hooks and loading/disabled semantics.
- Pie/scatter and other chart types, axes/composition APIs, multiple axes, tooltips, keyboard interactions, animations and full accessibility parity.
- Time/date-time fields, clocks, section editing, additional adapters, all locales/calendars, comprehensive timezone/DST transitions, full picker event lifecycle.
- Reanimated/Gesture Handler integration and calibrated release-build performance budgets.
- Bare React Native fresh-consumer and Android-device validation.

No Pro or Premium feature parity is planned. Eligibility comes from the pinned Community packages and source, not an assumption based on a feature name.

## Diagnostics

```ts
import { configureDiagnostics } from '@altroo/mui-native-system';

const restore = configureDiagnostics(({ code, message }) => {
  throw new Error(`${code}: ${message}`);
});
// Run migration fixtures, then restore().
```

An unsupported native import throws before a browser-only implementation can enter the bundle. Other compatibility gaps are recorded in this document and the roadmap; successful rendering does not mean full parity.
