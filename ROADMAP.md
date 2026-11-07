# MUI Native delivery roadmap

Current priority: [finish existing partial modules](docs/completion-plan.md) before adding new components. The queue separates software work, locally executable verification and external validation.

Updated: 2026-11-07. Priority: maximum compatibility with existing MUI app code, even when it takes longer.

## Decisions

- One repository: `Altroo/mui-native`. Separate npm packages in the monorepo.
- Public source and early npm previews under the `prealpha` tag. Verified alpha/stable publication still requires the release gates below.
- Independent project and branding. Upstream collaboration does not imply acceptance or endorsement.
- Material UI plus MIT-licensed MUI X Community only. Exclude Pro/Premium source and paid-only feature parity.
- Native iOS/Android renderers, original MUI on web. No WebView substitute.
- Detect upstream updates twice daily and prepare review issues. No automatic candidate PRs, merging, support promotion, or publishing.

## Feature completion workflow

Each feature needs appropriate local checks and independent review of hidden bugs, edge cases, design, architecture, performance and library consumers. Run `pnpm lint` and the affected validation before delivery; review changed source and resolve actionable warnings, unused imports and unused private declarations. Preserve exported library APIs. Fix actionable findings, rerun affected checks and review meaningful fixes again. Record device-only gaps explicitly. Deliver coherent changes with issue and validation links.

## 0. Repository, provenance, and automation

- [x] Create the repository and monorepo package boundaries.
- [x] Pin Node, pnpm, Expo, React, and React Native.
- [x] Upgrade the development and consumer baseline to SDK 58 / RN 0.88.1, including strict native refs/events and a separately validated SDK snapshot. Tracked in [issue #6](https://github.com/Altroo/mui-native/issues/6).
- [x] Verify npm package versions, package integrity, immutable source commits, and public API declaration hashes.
- [x] Preserve available MIT notices and flag missing license text.
- [x] Implement release detection, deduplication, detection-only telemetry, manual candidate review, and support-state separation.
- [x] Record the earlier successful scheduled upstream detection/preparation and its report artifact on GitHub. See [validation](docs/validation.md); detected releases still require separate native review.
- [ ] Verify protected-main telemetry persistence on a scheduled run after integration, retaining its timestamp and any error receipts.
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
- [ ] Exercise input composition, focus, keyboard and nested overlay behavior on both platforms. Matched cold-editor controls and authored replacement/clear diagnostics track the intermittent Android omission in [issue #58](https://github.com/Altroo/mui-native/issues/58); passing trials do not resolve its cause.
- [ ] Measure grid two-axis rendering, editing and row identity under load before scaling the architecture.
- [ ] Validate date/time editing, locale and timezone behavior against upstream fixtures.
- [ ] Measure chart hit targets, dense points, labels and accessibility.

Finish each component family against its agreed API, imports, native behavior and validation checklist before moving to the next family. Partial catalog prototypes remain unfinished inventory entries.

Performance is a gate for each family, starting with the alpha foundation. See [the performance contract](docs/performance.md) for workloads, native release-build evidence and the criteria for introducing Rust.

## 2. Compatibility foundation

Expand `createTheme`, palette derivation, typography, spacing, breakpoints, default props, style overrides, variants, slots and owner state. Finish `styled`, scoped state/slot selectors and precedence. Add native ref handles, controlled-state diagnostics, meaningful unsupported-prop diagnostics, event ordering and migration tooling. Prove module augmentation and public import paths in installed consumers. Add RTL, font scaling, reduced motion, focus coordination and overlay hosting.

Palette derivation and color helpers have pinned upstream reference fixtures and installed-consumer augmentation checks. See [native theming](docs/theming.md); broader styling contracts remain open.

Button and IconButton now compose the shared native ButtonBase host with distinct defaults, loading/content, keyboard/ref/action contracts, native custom roots and original class helpers. See [native buttons](docs/button.md) and [issue #33](https://github.com/Altroo/mui-native/issues/33). Native [ButtonGroup](docs/button-group.md) now composes this family with shared defaults, positions, class helpers and scoped descendant styles. Source/browser and installed-consumer checks pass, with scoped iOS/Android layout, state, touch, loading and ref evidence. Complete inherited/polymorphic contracts and physical accessibility/performance verification remain open.

Checkbox and Radio now compose native ButtonBase with checked/value event targets, native root/input slots and refs, scoped RadioGroup registration/keyboard ordering, FormGroup and FormControlLabel integration. See [checked controls](docs/check-controls.md) and [issue #34](https://github.com/Altroo/mui-native/issues/34). Root-slot sx replacement, checked/disabled specificity, named override ordering and scoped RTL inheritance now have original-browser/native-model regressions; see [issue #36](https://github.com/Altroo/mui-native/issues/36). Switch now has five-slot native composition, checked-control ownership, source-shaped callback phases/refs and native thumb motion; see [Switch](docs/switch.md) and [issue #35](https://github.com/Altroo/mui-native/issues/35). Browser forms/global named groups, remaining Switch/inherited/CSS contracts and physical validation remain open.

Spacing, breakpoint helpers, native width rules, responsive Stack spacing and Dialog widths have scoped upstream fixtures and component checks. See [layout boundaries](docs/layout-system.md). Device resize, RTL and full styling parity remain open.

Typography now has pinned theme and component source fixtures, class/default/style contracts and strict emitted/installed-consumer augmentation checks. Direct iOS scenarios pass all thirteen standard variants plus inherit at normal OS text and representative variants at the largest OS text size, including actual ellipsis/RTL paint, retained child state, events and refs. See [typography](docs/typography.md). Android component coverage, custom fonts, capped/live scaling policies, physical assistive technology, optimized text workloads, arbitrary CSS and remaining utilities stay open.

Default-prop context, deferred slot callbacks and explicit slot composition have pinned reference cases and native consumer checks. See [defaults](docs/default-props.md). TextField now mounts six native slots with composed refs and cleanup. See [native input slots](docs/textfield-slots.md). InputBase and the three input variants now share native state, adornments, row bounds and outline rendering with TextField; see [native inputs](docs/inputs.md). Native form/label states, floating/stacked layouts, scoped focus/name/helper links and reduced-motion transforms now have pinned and component evidence; see [forms and labels](docs/form-labels.md). Nested/scoped provider composition, Material theme selection and original provider/hook imports now have pinned and installed-consumer evidence; see [theme providers](docs/theme-providers.md). Complete input/label contracts, browser-global associations, other slots, CSS-variable/scheme providers and native validation remain open. Reusable Modal/Backdrop, coordinated native dismissal/focus, transition lifecycle wiring and Dialog slots now have scoped reference/component/consumer evidence; see [modals](docs/modals.md). Native Fade/Grow, measured automatic timing, theme timing/motion helpers and Dialog/Backdrop transition slots now have pinned lifecycle and installed-consumer evidence; see [transitions](docs/transitions.md) and [Grow](docs/grow.md). Anchored native Popover now has pinned geometry, lifecycle/slot regressions and installed-consumer coverage; see [Popover](docs/popover.md). ButtonBase now provides native activation/focus composition backed by an explicit Fabric interaction host; see [ButtonBase](docs/button-base.md) and [native host](docs/native-host.md). A native development build is required to render it. The eight native List primitives now provide density, typed slots, end-action fitting and owned scrolling/sticky subheaders; see [native lists](docs/lists.md). Registered MenuItem/MenuList focus, keyboard/typeahead, native roles and connected-node ordering now have pinned runtime and installed-consumer evidence; see [native menu lists](docs/menu-list.md). Anchored Menu now composes five native slots, overlay readiness, dismissal and observed button/input focus tracking; see [native Menu](docs/menu.md). Default Modal/Popover roots use the explicit native host, including generic Dialog fallback. Select and checked-control migration now have scoped guides below; remaining controls follow. Declared foreign-control navigation now includes the finite editable-input commands documented in [native host](docs/native-host.md), preserving actual React targets and standard callback paths. Android sequence ownership has 22 installed emulator checks, including focus changes and separate Dialog windows. Extended UIKit command delivery remains an open gate; its command metadata is limited and a native rebuild is required. Broader foreign-input keyboard contracts, complete portals, tab trapping, scroll locking, remaining transitions, complete text/CSS inheritance, calibrated performance and device validation remain open. Literal text and tracked inheritance through library containers now have native and browser-reference cases; see [text containers](docs/text-containers.md).

Native Select and TextField select now have pinned original-runtime fixtures, raw value/event/ref regressions, owner-state slot composition and installed-package checks. See [Select](docs/select.md) and [issue #30](https://github.com/Altroo/mui-native/issues/30). The [platform-native picker host](docs/native-picker.md) supplies the next native selection foundation. Material NativeSelect/platform-picker composition is documented in [native selection](docs/native-select.md); physical keyboard/focus/accessibility/RTL/performance gates remain unfinished.

Native Popper now composes the positioning engine with measured native frames, window/inline Portal routing, native/virtual anchors, root slots/ref/instance lifecycle, keepMounted and transitions. See [Popper](docs/popper.md) and [issue #39](https://github.com/Altroo/mui-native/issues/39). Physical native and release-performance gates remain open. Native [Autocomplete](docs/autocomplete.md) now integrates the input, listbox, mapped/multiple values, renderers, headless hook and all eight slots. Scoped emulator checks cover its core interactions; full physical/accessibility/performance gates remain. Android ordinary/full-screen Dialog checks now verify that child Escape dismisses suggestions without closing the parent, followed by default parent dismissal; see [issue #60](https://github.com/Altroo/mui-native/issues/60). Native caret-start Left now enters selected items, with guarded editor defaults, first-item clamping, batched focus ordering and keyboard focus visuals verified in scoped Android/iOS checks; see [tag navigation evidence](docs/validation.md#2026-11-04-native-caret-boundary-tag-navigation). Native empty-editor Backspace now has actual text/range guards, and Android checks cover selected-Chip Delete and final-value declaration removal. The default Material editor now preserves the reviewed React Native text/ref/state implementation and adds guarded software-deletion boundaries. Scoped iOS 27 checks cover visible software Delete; a scoped rapid visible-Delete check also passes on the correctly registered Android API37/Gboard binary after a bounded native acknowledgement correction; iOS hardware Backspace, other IMEs and complete physical tag variants remain open. Two iOS Escape cases remain explicitly unverified after the independent UIKit driver control receives no Escape. Its editable-keyboard dependency is tracked in [issue #55](https://github.com/Altroo/mui-native/issues/55); extended iOS and physical-keyboard gates remain open.

The separate [Android Popper release benchmark](docs/performance-popper.md) now checks production build identity, actual input/scroll behavior, frame deadlines, collector loss and report completeness. One emulator pilot completed; a repeat failed its native swipe assertion. Reproducible comparisons, iOS collection and physical calibration remain open. This tooling does not complete family performance certification.

Native [Collapse](docs/collapse.md) now supplies the retained height/width transition foundation for later Accordion, Stepper and tree integration. It includes measured timing, lifecycle/slot/import contracts and scoped iOS/Android checks. Physical-device, screen-reader, font/RTL and calibrated-performance matrices remain open; this does not complete those dependent components.

Native [Accordion](docs/accordion.md) now composes Summary, Details and Actions with controlled/uncontrolled expansion, source-defined callback/slot priority, native refs, keyboard activation and retained Collapse content. Original-runtime comparisons, installed-consumer checks and scoped iOS/Android interactions cover this subset. It is development work after `0.0.7-prealpha.0`; grouping/animation policies, full inherited/polymorphic contracts, physical accessibility/font/RTL and calibrated performance remain open.

Native [SvgIcon and factories](docs/svg-icon.md) now share actual SVG rendering, source-ordered presentation/theme contracts and typed root/deep imports with the icon package. Original-browser and installed-consumer checks cover this source increment after `0.0.7-prealpha.0`. Scoped iOS/Android scene checks verify sizes, palette events, native refs and visible font samples; Android also checks actual paint and text pixels. The [complete pinned artwork and import catalog](docs/material-icons.md) is implemented separately. Fill transitions, complete inherited renderer contracts and physical accessibility/font/RTL/performance gates remain unfinished.

Native [Divider](docs/divider.md) now has pinned variants, label geometry, utility classes, generic native roots, defaults/overrides and retained refs. Its twelve-state scene passes on iOS and Android at normal and enlarged OS text sizes. General pseudo-elements, sibling selectors, broader native RTL/swap and viewport cases, physical assistive technology and calibrated performance remain open. This is unpublished development after `0.0.7-prealpha.0`; the finite native checks do not certify full compatibility.

Native [Paper](docs/paper.md) now has pinned surface defaults, all 29 utility classes, custom native roots/refs, typed theme configuration and all 25 dark-elevation overlays. Its two retained roots pass the 33-state scene at normal and enlarged OS text sizes on iOS and Android. Browser CSS-variable themes, calibrated GPU shadows, wider native matrices, physical accessibility and optimized-build performance remain explicit gates.

Native [Box](docs/box.md) now retains the pinned 9.5.0 props/classes, native custom-root requirements, theme selection and sx/native-style priority. Its default, custom and styled roots pass eleven states at normal and enlarged text sizes on iOS and Android. The canonical className facade participates in Box; other families are separate work. Browser CSS-variable themes, arbitrary selectors, wider native matrices, physical accessibility and optimized Box performance remain explicit gates.

## Early public pre-alpha channel

Early preview packages may be published under the `prealpha` dist-tag for consumer feedback before family certification. They must contain real implementations, clear compatibility/native-build limits, MIT/upstream notices and aligned dependency versions. Require local checks, clean archive-consumer installation, package-content inspection, a publish dry run and independent review. Keep verified/released upstream-support state unchanged. This channel does not complete the verified-alpha checklist.

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

Native [Chip](docs/chip.md) adds the reusable display/action/deletion dependency for Autocomplete; see [issue #37](https://github.com/Altroo/mui-native/issues/37). Autocomplete now composes these dependencies with a native editor and suggestions; full physical validation remains. Its [Portal foundation](docs/portal.md) now has source-backed container/ref contracts and native rendering code; [issue #38](https://github.com/Altroo/mui-native/issues/38) tracks this reusable dependency. The [native positioning engine](docs/native-positioning.md) now has source-backed placement/modifier/lifecycle comparisons; [issue #39](https://github.com/Altroo/mui-native/issues/39) tracks the complete Popper integration. Native anchor/clipping observation transport now has model and compile checks. The measured adapter and public Popper component/imports are implemented; extended iOS/tag keyboard delivery, physical validation, complete accessibility and calibrated release performance remain unfinished.

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

## Native mobile extension track

Add selected mobile-specific patterns alongside the full Material UI/X compatibility work, after the first pre-alpha preview. Use the same theme, `sx`, controlled-state, ref, slots/slotProps, defaults/overrides/variants and documentation conventions. Keep genuinely new APIs in an explicitly native extension namespace; do not invent original `@mui/material` imports. The proposed optional `@altroo/mui-native-mobile` package is not created or published until it contains real components. See [the design and examples](docs/mobile-extensions.md).

- [ ] Prioritize safe-area/keyboard-aware Screen composition, a useful themed ScrollView, and FlatList/SectionList integration while preserving native virtualization.
- [ ] Compose RefreshControl and refresh/load-more states into lists; keep fetching, sorting and filtering models application-owned unless a separate library contract requires them.
- [ ] Add a native BottomSheet with snap points, gestures, keyboard/focus ownership and MUI-style customization; then evaluate action sheets and swipeable list actions.
- [ ] Document BackHandler and StatusBar integration through focused recipes/ownership helpers; preserve application navigation and system behavior.
- [ ] Keep PermissionsAndroid application-owned and platform-specific. Use Snackbar for the cross-platform UI track, document ToastAndroid/ActionSheetIOS where useful, and complete native MUI Drawer before adding a duplicate DrawerLayoutAndroid wrapper.
- [ ] Ship typed root/deep imports, full examples, accessibility alternatives, cleanup regressions, both-platform interactions and release performance evidence for each implemented extension.

This track extends native capabilities; it does not replace or reduce the agreed Material UI/X scope or certify any unimplemented API.

## After alpha: simplify installation

- [ ] Provide a short, verified setup flow for Expo and bare React Native, with automatic native configuration where possible, compatible peer checks and clear rebuild diagnostics.
- [ ] Replace the development tarball workflow with a concise published-package quickstart, a minimal consumer example and actionable troubleshooting.

Installation improvements follow alpha integration and release gates; they do not replace the current native rebuild requirement.
