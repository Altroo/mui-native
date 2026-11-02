# Compatibility contract

Current status: prototypes. All implemented components are **adapted subsets**, not exact equivalents. `upstream/state.json` deliberately leaves `portedAndVerified` and `releasedSupport` empty.

## Currently exercised

- Object, function, and array `sx`; palette paths; spacing; fractional sizing; `px`/`rem`; responsive values; selected `&.Mui-state` selectors; root overrides and variants.
- Palette shade/contrast derivation, light/dark defaults, augmentColor, color helpers and Palette/PaletteOptions augmentation. See [native theming](theming.md) for tested inputs and limitations.
- Button loading positions, custom indicators, disabled presses and native busy state. See [native Button loading](button.md); screen-reader behavior remains unverified.
- Controlled/uncontrolled form state, value/name change adapters, disabled buttons, native handler precedence, checkbox/radio selection.
- Native modal backdrop and Android back-request close reasons; snackbar timeout cleanup.
- Grid identity validation, single-column sorting/filtering, fixed-width columns, page size up to 100, include/exclude selection models. Row recycling uses FlashList. Server-mode inputs remain application-owned.
- Rich tree expansion and selection, including validation of duplicate IDs in collapsed branches.
- Bar/line chart numeric values, null gaps, basic categorical labels, item callbacks.
- Strict Day.js field parsing, partial invalid text, calendar-day bounds and named timezone parsing. DatePicker currently publishes calendar selection when the user accepts, which differs from upstream live-selection callback timing.

## Unsupported or not yet verified

Do not assume unlisted props work. Public TypeScript interfaces describe the implemented subset. JavaScript callers should run migration diagnostics and review source usage before adoption.

- Full Material UI export coverage, all icon variants, slot replacement, classes/className, arbitrary CSS, CSS variables, media queries, arbitrary descendant selectors, browser refs/events, transitions, ripple behavior.
- Full `styled` semantics, nested theme merging, typography inheritance, complete breakpoint utilities, all upstream augmentation interfaces. The installed-consumer fixture verifies custom Theme, ThemeOptions, Palette and PaletteOptions augmentation through @mui/material/styles.
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
