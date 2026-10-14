# MUI Native delivery roadmap

Updated: 2026-10-14. Priority: maximum compatibility with existing MUI app code, even when it takes longer.

## Decisions

- One repository: `Altroo/mui-native`. Separate npm packages in the monorepo.
- No npm publication before release gates pass.
- Independent project and branding. Upstream collaboration does not imply acceptance or endorsement.
- Material UI plus MIT-licensed MUI X Community only. Exclude Pro/Premium source and paid-only feature parity.
- Native iOS/Android renderers, original MUI on web. No WebView substitute.
- Detect and prepare upstream updates twice daily. No automatic merging, support promotion, or publishing.

## 0. Repository, provenance, and automation

- [x] Create the repository and monorepo package boundaries.
- [x] Pin Node, pnpm, Expo, React, and React Native.
- [x] Verify npm package versions, package integrity, immutable source commits, and public API declaration hashes.
- [x] Preserve available MIT notices and flag missing license text.
- [x] Implement release detection, deduplication, candidate preparation, explicit candidate CI dispatch, and support-state separation.
- [ ] Validate the scheduled workflow and dashboard on GitHub with repository permissions.
- [ ] Complete transitive dependency/license audit and exported-symbol/prop/slot inventory.

Material UI baseline: 9.5.0. Stable X baseline: 9.15.0. Scheduler: 9.0.0-beta.13. Chat: 9.0.0-alpha.19, blocked for missing license text. These are references, not support claims. See `upstream/state.json` for exact commits and provenance.

## 1. Prove the architecture

- [x] Native theme, spacing and responsive styling engine with diagnostics.
- [x] Material UI form prototype using original imports through Metro.
- [x] Native grid, rich tree, chart and date prototypes.
- [ ] Verify packed-package imports, TypeScript augmentation, and web isolation together.
- [ ] Exercise input composition, focus, keyboard and nested overlay behavior on both platforms.
- [ ] Measure grid two-axis rendering, editing and row identity under load before scaling the architecture.
- [ ] Validate date/time editing, locale and timezone behavior against upstream fixtures.
- [ ] Measure chart hit targets, dense points, labels and accessibility.

## 2. Compatibility foundation

Expand `createTheme`, palette derivation, typography, spacing, breakpoints, default props, style overrides, variants, slots and owner state. Finish `styled`, scoped state/slot selectors and precedence. Add native ref handles, controlled-state diagnostics, meaningful unsupported-prop diagnostics, event ordering and migration tooling. Prove module augmentation and public import paths in installed consumers. Add RTL, font scaling, reduced motion, focus coordination and overlay hosting.

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

Implement remaining eligible exports in dependency order, including navigation, lists, menus, tabs, drawers, popovers, tooltips, Select, Autocomplete, Slider, Rating, Accordion, Stepper, Pagination, Breadcrumbs, SpeedDial, Table, ImageList, TransferList and other actual baseline exports. Do not ship empty stand-ins. Generate coverage from the inventory, not a manually inflated percentage. Audit Lab separately.

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
