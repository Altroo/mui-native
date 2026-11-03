# MUI Native delivery roadmap

Updated: 2026-11-03. Priority: maximum compatibility with existing MUI app code, even when it takes longer.

## Decisions

- One repository: `Altroo/mui-native`. Separate npm packages in the monorepo.
- Public source pre-alpha. No npm publication before release gates pass.
- Independent project and branding. Upstream collaboration does not imply acceptance or endorsement.
- Material UI plus MIT-licensed MUI X Community only. Exclude Pro/Premium source and paid-only feature parity.
- Native iOS/Android renderers, original MUI on web. No WebView substitute.
- Detect and prepare upstream updates twice daily. No automatic merging, support promotion, or publishing.

## Feature completion workflow

Each feature needs appropriate local checks and independent review of hidden bugs, edge cases, design, architecture, performance and library consumers. Fix actionable findings, rerun affected checks and review meaningful fixes again. Record device-only gaps explicitly. Deliver coherent changes with issue and validation links.

## 0. Repository, provenance, and automation

- [x] Create the repository and monorepo package boundaries.
- [x] Pin Node, pnpm, Expo, React, and React Native.
- [x] Upgrade the development and consumer baseline to SDK 58 / RN 0.88.1, including strict native refs/events and a separately validated SDK snapshot. Tracked in [issue #6](https://github.com/Altroo/mui-native/issues/6).
- [x] Verify npm package versions, package integrity, immutable source commits, and public API declaration hashes.
- [x] Preserve available MIT notices and flag missing license text.
- [x] Implement release detection, deduplication, candidate preparation, explicit candidate CI dispatch, and support-state separation.
- [x] Observe successful scheduled upstream detection/preparation and its report artifact on GitHub. See [validation](docs/validation.md); detected releases still require separate native review.
- [x] Generate an integrity-checked declaration inventory with import targets, export origins, direct props/events/slots and native declaration candidates. See [coverage](docs/coverage.md); this is not a compatibility claim.
- [ ] Resolve external re-exports and inherited/generic contracts, attach behavior evidence, and complete the transitive dependency/license audit.

Material UI baseline: 9.5.0. Stable X baseline: 9.15.0. Scheduler: 9.0.0-beta.13. Chat: 9.0.0-alpha.19, blocked for missing license text. These are references, not support claims. See `upstream/state.json` for exact commits and provenance.

## 1. Prove the architecture

- [x] Native theme, spacing and responsive styling engine with diagnostics.
- [x] Material UI form prototype using original imports through Metro.
- [x] Native form-label activation/content sizing, input alias guards and localized calendar weekday layout, with isolated regressions and consumer validation. Tracked in [issue #7](https://github.com/Altroo/mui-native/issues/7); device accessibility and full picker contracts remain open.
- [x] Native grid, rich tree, chart and date prototypes.
- [x] Optional adaptive native grid cards with a shared data model, explicit table mode and application-composed content. Scoped local checks cover model preservation; native visual, accessibility and performance gates remain open.
- [ ] Verify packed-package imports, TypeScript augmentation, and web isolation together.
- [ ] Exercise input composition, focus, keyboard and nested overlay behavior on both platforms.
- [ ] Measure grid two-axis rendering, editing and row identity under load before scaling the architecture.
- [ ] Validate date/time editing, locale and timezone behavior against upstream fixtures.
- [ ] Measure chart hit targets, dense points, labels and accessibility.

Performance is a gate for each family, starting with the alpha foundation. See [the performance contract](docs/performance.md) for workloads, native release-build evidence and the criteria for introducing Rust.

## 2. Compatibility foundation

Expand `createTheme`, palette derivation, typography, spacing, breakpoints, default props, style overrides, variants, slots and owner state. Finish `styled`, scoped state/slot selectors and precedence. Add native ref handles, controlled-state diagnostics, meaningful unsupported-prop diagnostics, event ordering and migration tooling. Prove module augmentation and public import paths in installed consumers. Add RTL, font scaling, reduced motion, focus coordination and overlay hosting.

Palette derivation and color helpers have pinned upstream reference fixtures and installed-consumer augmentation checks. See [native theming](docs/theming.md); broader styling contracts remain open.

Button and IconButton now compose the shared native ButtonBase host with distinct defaults, loading/content, keyboard/ref/action contracts, native custom roots and original class helpers. See [native buttons](docs/button.md) and [issue #33](https://github.com/Altroo/mui-native/issues/33). Complete inherited/polymorphic contracts, ButtonGroup and physical accessibility/performance verification remain open.

Checkbox and Radio now compose native ButtonBase with checked/value event targets, native root/input slots and refs, scoped RadioGroup registration/keyboard ordering, FormGroup and FormControlLabel integration. See [checked controls](docs/check-controls.md) and [issue #34](https://github.com/Altroo/mui-native/issues/34). Root-slot sx replacement, checked/disabled specificity, named override ordering and scoped RTL inheritance now have original-browser/native-model regressions; see [issue #36](https://github.com/Altroo/mui-native/issues/36). Switch now has five-slot native composition, checked-control ownership, source-shaped callback phases/refs and native thumb motion; see [Switch](docs/switch.md) and [issue #35](https://github.com/Altroo/mui-native/issues/35). Browser forms/global named groups, remaining Switch/inherited/CSS contracts and physical validation remain open.

Spacing, breakpoint helpers, native width rules, responsive Stack spacing and Dialog widths have scoped upstream fixtures and component checks. See [layout boundaries](docs/layout-system.md). Device resize, RTL and full styling parity remain open.

Typography theme values and native normalization now have pinned upstream fixtures, component regressions and installed-consumer augmentation checks. See [typography](docs/typography.md). Font availability, native visual/accessibility evidence, arbitrary CSS and remaining utilities are still open.

Default-prop context, deferred slot callbacks and explicit slot composition have pinned reference cases and native consumer checks. See [defaults](docs/default-props.md). TextField now mounts six native slots with composed refs and cleanup. See [native input slots](docs/textfield-slots.md). InputBase and the three input variants now share native state, adornments, row bounds and outline rendering with TextField; see [native inputs](docs/inputs.md). Native form/label states, floating/stacked layouts, scoped focus/name/helper links and reduced-motion transforms now have pinned and component evidence; see [forms and labels](docs/form-labels.md). Nested/scoped provider composition, Material theme selection and original provider/hook imports now have pinned and installed-consumer evidence; see [theme providers](docs/theme-providers.md). Complete input/label contracts, browser-global associations, other slots, CSS-variable/scheme providers and native validation remain open. Reusable Modal/Backdrop, coordinated native dismissal/focus, transition lifecycle wiring and Dialog slots now have scoped reference/component/consumer evidence; see [modals](docs/modals.md). Native Fade/Grow, measured automatic timing, theme timing/motion helpers and Dialog/Backdrop transition slots now have pinned lifecycle and installed-consumer evidence; see [transitions](docs/transitions.md) and [Grow](docs/grow.md). Anchored native Popover now has pinned geometry, lifecycle/slot regressions and installed-consumer coverage; see [Popover](docs/popover.md). ButtonBase now provides native activation/focus composition backed by an explicit Fabric interaction host; see [ButtonBase](docs/button-base.md) and [native host](docs/native-host.md). A native development build is required to render it. The eight native List primitives now provide density, typed slots, end-action fitting and owned scrolling/sticky subheaders; see [native lists](docs/lists.md). Registered MenuItem/MenuList focus, keyboard/typeahead, native roles and connected-node ordering now have pinned runtime and installed-consumer evidence; see [native menu lists](docs/menu-list.md). Anchored Menu now composes five native slots, overlay readiness, dismissal and observed button/input focus tracking; see [native Menu](docs/menu.md). Default Modal/Popover roots use the explicit native host, including generic Dialog fallback. Select and checked-control migration now have scoped guides below; remaining controls follow. Declared foreign-control Tab/Escape now preserves actual React targets and standard callback paths, with both-platform compile/link and JavaScript contract evidence; UIKit command metadata is limited and a native rebuild is required. Broader foreign-input keyboard contracts, complete portals, tab trapping, scroll locking, remaining transitions, complete text/CSS inheritance, calibrated performance and device validation remain open. Literal text and tracked inheritance through library containers now have native and browser-reference cases; see [text containers](docs/text-containers.md).

Native Select and TextField select now have pinned original-runtime fixtures, raw value/event/ref regressions, owner-state slot composition and installed-package checks. See [Select](docs/select.md) and [issue #30](https://github.com/Altroo/mui-native/issues/30). The [platform-native picker host](docs/native-picker.md) supplies the next native selection foundation. Material NativeSelect/platform-picker composition is documented in [native selection](docs/native-select.md); physical keyboard/focus/accessibility/RTL/performance gates remain unfinished.

## 3. Verified alpha

Core scope: Box, Stack, Typography, Divider, Paper, Card, Button, IconButton, initial icons, TextField/FormControl parts, Checkbox, Radio, Switch, Dialog, Alert, progress and Snackbar.

Release gates:

- [ ] Contract and type checks for every declared supported prop and public subpath.
- [ ] Actual iOS and Android interaction, keyboard, accessibility and screenshot evidence.
- [ ] Packed archives install in clean Expo and bare React Native consumers.
- [ ] Original MUI browser reference remains intact.
- [ ] Install/use docs, limitations, notices, changelog, contributing and security guidance are accurate.
- [ ] npm namespace ownership and distribution notices reviewed.
- [ ] `0.1.0-alpha.1` publication only after the above.

## 4. Complete Material UI

Implement remaining eligible exports in dependency order, including navigation, lists, menus, tabs, drawers, popovers, tooltips, remaining Select/NativeSelect contracts, Autocomplete, Slider, Rating, Accordion, Stepper, Pagination, Breadcrumbs, SpeedDial, Table, ImageList, TransferList and other actual baseline exports. Do not ship empty stand-ins. Generate coverage from the inventory, not a manually inflated percentage. Audit Lab separately.

## 5. Complete the four stable X Community families

1. Tree View: composition, expansion/selection models, disabled states, hooks, slots, loading and public APIs eligible in Community.
2. Pickers: fields, calendar/clock/date/time/date-time views, validation, locale text, timezone handling and Day.js/date-fns/Luxon/Moment adapters. Range features remain excluded when commercial.
3. Charts: eligible types, scales, axes, composition, legends/tooltips, callbacks, accessibility and touch behavior.
4. Grid: Community models, column/row virtualization, single sorting/filtering, pagination, selection, editing, server modes, slots and eligible apiRef methods. Preserve row identity across recycling, failed edits and async updates.

Each family gets its own contract matrix, native/web comparison fixtures and performance evidence. Prototypes currently cover only the subsets in `docs/compatibility.md`.

## 6. Beta and stable

Test a form-heavy application and a dashboard with shared web/native source. Add codemods and actionable diagnostics for migration-required patterns. Generate API docs and measured compatibility tables. Require clean installs, versioned changelogs and rollback instructions.

Measure release builds on documented devices: a 10,000-row/50-column grid, 1,000-row editing scenario, 10,000-node tree, and 1,000/10,000-point charts. Initial targets are local input feedback p95 below 100 ms, smooth scrolling on a 60 Hz reference device, and bounded memory after repeated interactions. Targets are not achieved claims.

Stable 1.0 covers the explicitly declared Material UI and four stable X Community contracts. It does not promise all historical MUI versions or arbitrary web code compatibility.

## 7. Experimental families

Scheduler and Chat remain isolated preview tracks. Resolve Chat licensing provenance before reuse. Freeze preview versions separately and expect breaking API changes. They do not block the first stable core/X milestone.

## 8. Ongoing upkeep

Review update issues weekly, prioritize relevant security changes, and implement candidates against immutable source/API/license comparisons. Keep one active candidate per family/channel/major, preserve human edits, and process missed publications after outages. Upgrade Expo/React Native/tooling in separate changes. Check scheduler health monthly, including GitHub's inactivity disabling behavior for public repositories. Never equate a dependency bump with a completed native port.

NativeSelect, native Select and native TextField now parse option/group configuration, preserve DOM-shaped string/selectedOptions semantics and native refs, and hold overlay ownership through actual native dismissal. See [native selection](docs/native-select.md) and [issue #32](https://github.com/Altroo/mui-native/issues/32). Full browser forms, inline list layout and physical picker/accessibility/performance gates remain open.
