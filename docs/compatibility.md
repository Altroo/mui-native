# Compatibility contract

The [generated declaration inventory](coverage.md) records baseline imports, export origins and direct contract members. It does not establish parity; unresolved dependencies and inherited contracts remain explicit gaps.

Current status: prototypes. All implemented components are **adapted subsets**, not exact equivalents. `upstream/state.json` deliberately leaves `portedAndVerified` and `releasedSupport` empty.

## Currently exercised

- Native [Accordion family](accordion.md): expansion, Summary/Details/Actions composition, source-defined slot/callback priority, refs and shared ButtonBase/Collapse behavior. Scoped iOS/Android checks cover retained local edits, controlled panels, actions, disabled interaction and optional unmounting. This is development work after `0.0.7-prealpha.0`; full native matrices and inherited contracts remain open.

- Native [Portal](portal.md) with same-window rendering, ordinary View containers, context/state/ref preservation, native bounds and guarded touch/keyboard ownership. Active clipped-subview containers and full physical device validation remain open.

- Native [Chip](chip.md) display/action/deletion, root/label slots, native refs, typography and class helpers, with explicit native touch-target and disabled-deletion adaptations. Autocomplete composition is implemented; physical native validation remains open.

- A low-level [platform-native picker host](native-picker.md) with UIKit/Android implementations, modeled events, a JVM lifecycle policy check and compile/link evidence. Material integration is documented in [native selection](native-select.md); physical device gates remain unfinished.

- Native Select and TextField select with raw single/multiple values, Menu composition, keyboard/typeahead, value/name events, native refs and Select owner-state slots. See [Select](select.md); NativeSelect/platform-picker integration is described in [native selection](native-select.md); physical device gates remain open.

- Anchored native Menu with five slots, source-shaped close/focus policy, native presentation gates, observed trigger restoration and nested keyboard ownership. Declared descendant Tab/Escape retains actual control targets and callbacks; UIKit command metadata is limited. See [native Menu](menu.md) and [native host](native-host.md); broader foreign-input keyboard contracts and physical overlay gates remain open.

- Registered native MenuItem/MenuList composition, connected-node order, focus handoff, keyboard/typeahead, checkable roles and owned scrolling. See [native menu lists](menu-list.md) for the tested subset, native differences and open device and platform-picker gates.

- Eight native List composition primitives with density, slots, natural action sizing and optional owned scrolling/sticky subheaders. See [native lists](lists.md) for the tested subset and native boundaries.
- Native ButtonBase activation, disabled/focus coordination, native keyboard event adapters and touch feedback, with a Fabric interaction host. A native development build is required; Expo Go does not contain the host. See [ButtonBase](button-base.md) and [native host](native-host.md) for scope and open gates.
- Anchored native Popover with window/local coordinate conversion, origin/margin adjustment, default Grow, typed refs/actions and slots. See [Popover](popover.md) for native boundaries and device gates.

- Literal text in native library containers, shared text inheritance, native Text/View boundaries and custom scopes. See [text containers](text-containers.md).

- Native Fade/Grow, measured automatic height timing, theme transitions/motion helpers and Dialog/Backdrop transition slots with native-driver opacity, lifecycle and reduced-motion checks. See [transitions](transitions.md) and [Grow](grow.md).
- Reusable Modal/Backdrop, top-layer dismissal, guarded native focus work, custom transition lifecycle wiring and Dialog slots/root routing. See [native modals](modals.md).

- Shallow nested themes, callback replacement, System scopes, Material THEME_ID selection, shared original imports and RTL context. See [theme providers](theme-providers.md).

- Dedicated FormLabel/InputLabel/FormHelperText contracts, floating/stacked fields, scoped focus/name/helper links and reduced-motion-aware native transforms. See [forms and labels](form-labels.md).
- InputBase/Input/FilledInput/OutlinedInput, adornments, native row bounds and coordinated form state. See [native inputs](inputs.md) for the implemented subset and native differences.
- TextField replacement of six native slots, including Select, distinct input-container and editable-host contracts, composed refs and React 19 cleanup. See [native input slots](textfield-slots.md).
- Theme/default-prop contexts, named slot default merging, TextField owner-state callbacks and explicit slot prop composition. See [defaults](default-props.md) for replacement rules and native differences.

- MUI-shaped typography themes, callbacks/conversion, native text normalization, custom variants, heading mapping and tracked text inheritance. See [typography](typography.md) for native differences and explicit limits.

- Object, function, and array `sx`; palette paths; spacing; fractional sizing; `px`/`rem`; responsive values; selected `&.Mui-state` selectors; root overrides and variants.
- Spacing arrays/functions/strings and multi-value helpers, breakpoint methods and custom keys, native width media rules, responsive Stack spacing and Dialog widths. See [layout system](layout-system.md) for supported units, ordering and limitations.
- Palette shade/contrast derivation, light/dark defaults, augmentColor, color helpers and Palette/PaletteOptions augmentation. See [native theming](theming.md) for tested inputs and limitations.
- Button and IconButton on native ButtonBase, with distinct defaults, loading positions/content, native refs/actions/keys, native custom roots, augmentation and original class helpers. See [native buttons](button.md); physical interaction/accessibility/performance and full inherited APIs remain unverified.
- Native Switch with five slots, checked-control event/focus ownership, source-shaped refs/callback phases, theme styles and native thumb motion. See [Switch](switch.md); browser forms, CSS transition interpolation and physical native validation remain open.
- Checkbox/Radio native ButtonBase composition, checked/value event adapters, scoped RadioGroup ordering/keys, FormGroup and FormControlLabel precedence/typography slots. See [native checked controls](check-controls.md); browser forms/global radio coordination and physical accessibility/performance remain open.
- Native modal backdrop and Android back-request close reasons; snackbar timeout cleanup. Full overlay/focus/transition/device contracts remain open.
- Optional native grid cards, automatic switching at 600 dp of container width, explicit table mode and application-composed card content. See [native grid layouts](adaptive-grid.md).
- Grid identity validation, single-column sorting/filtering, fixed-width columns, page size up to 100, include/exclude selection models. Row recycling uses FlashList. Server-mode inputs remain application-owned.
- Rich tree expansion and selection, including validation of duplicate IDs in collapsed branches.
- Bar/line chart numeric values, null gaps, basic categorical labels, item callbacks.
- Strict Day.js field parsing, partial invalid text, calendar-day bounds and named timezone parsing. DatePicker currently publishes calendar selection when the user accepts, which differs from upstream live-selection callback timing.

- Native Popper with measured native/virtual anchors, Portal/inline rendering, root slots, instance refs, modifier/placement lifecycle and original imports. See [Popper](popper.md) for explicit native boundaries and remaining device/release gates.

- Native [Autocomplete](autocomplete.md) input/listbox composition, mapped and multiple selections, renderValue, grouping, all slots and headless imports have source-backed checks and scoped emulator evidence. Physical/tag keyboard completeness, screen readers, large-option performance and full parity remain open.

## Unsupported or not yet verified

Do not assume unlisted props work. Public TypeScript interfaces describe the implemented subset. JavaScript callers should run migration diagnostics and review source usage before adoption.

- Browser form/autofill/reset behavior, native inline-list layout, complete Select inherited contracts and physical picker validation.
- Full Material UI export coverage, all icon variants, remaining component slot replacement, classes/className, arbitrary CSS, CSS variables, non-width media queries, arbitrary descendant selectors, browser refs/events, remaining transitions/TransitionGroup interoperation, ripple behavior.
- Full `styled` semantics, CSS-variable/color-scheme providers, complete typography inheritance, the full responsive/style utility export set, all upstream augmentation interfaces. The installed-consumer fixture verifies custom Theme, ThemeOptions, Palette, PaletteOptions and BreakpointOverrides augmentation through @mui/material/styles.
- Full browser inline formatting, opaque custom-component text internals, arbitrary native views/portals outside shared text scopes and complete text inheritance. See [text container boundaries](text-containers.md).
- Device-proven nested modal/focus restoration, keyboard avoidance on all devices, VoiceOver/TalkBack workflows, RTL and large-font layouts.
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
