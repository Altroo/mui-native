# Changelog

## Unreleased

- Add dedicated native DialogTitle defaults, Text roots/refs, utility classes, source-ordered Typography composition and scoped imports. Dialog paper and titles share stable IDs with explicit caller/slot precedence. Normal/enlarged/restored iOS and Android development checks verify retained title geometry, native refs, real dialog actions and Android label targets; physical accessibility and full release gates remain open.
- **Breaking for earlier native previews:** the `@mui/material/DialogTitle` deep entry exports only Title, its types and class helpers. Import unrelated layout components from the Material root or their own paths.
- Preserve genuine styles through styled title composition, honor explicit/inherited themes and sequential theme attachment, and apply the canonical class-name generator to Typography's utility classes.

- Add dedicated native DialogActions defaults, utility classes, typed roots/refs, theme composition and scoped original imports. Retained iOS/Android checks exercise spacing, RTL and both `sx`/native-style flex sizing paths. Largest-text presentation and full release gates remain open.
- **Breaking for earlier native previews:** the `@mui/material/DialogActions` deep entry no longer re-exports unrelated layout components. Import those components from the Material root or their own paths.
- Restore supported incoming and descendant class selectors for CardActions through the existing native physical style scope, without adding action wrappers.

- Add dedicated native CardActions defaults, classes, spacing controls, root/ref typing, theme composition and original class-helper imports. Normal/enlarged iOS and Android checks retain the row and real action state. Native column-gap behavior remains an explicit browser-layout adaptation.
- **Breaking for earlier native previews:** the `@mui/material/CardActions` deep entry no longer re-exports unrelated layout components. Import those components from the Material root or their own paths. The native `component="div"` alias remains supported.
- Prepare ButtonGroup theme/variant/sx callbacks once at their owning styled root and reuse the sheets during child updates. Preserve source getter order, deferred root arguments, native direction geometry and the established native recursive-slot extension. The shared insertion-history fix is tracked in [#127](https://github.com/Altroo/mui-native/issues/127); broader CSS and release-performance gates remain separate.

## 0.0.8-prealpha.0

All nine scoped packages remain pre-alpha and share this version. Use npm `latest` or explicit `0.0.8-prealpha.0` versions; the `prealpha` alias is not consistently aligned across packages. This does not certify full MUI/MUI X compatibility or verified-alpha readiness.

- Include all **10,750 pinned Material icon exports**, original names and supported deep imports. Preserve upstream wrapper/artwork notices and use bounded ESM build batches; direct icon imports remain preferable for startup.
- Add the native Accordion family, ButtonGroup, SvgIcon and React-node SVG factories. Expand Typography, Divider, Paper, Box, Card, FormGroup, ListItemIcon, ListItemAvatar and MenuItem icon styling with pinned props/classes, native roots/refs, source-ordered themes and installed-consumer coverage. Individual compatibility and physical-device gates remain documented.
- Complete the finite RTL/default-prop provider, theme-reading/theme-prop hook, spacing and breakpoint helper contracts. Broader theme construction, provider composition and arbitrary CSS remain separate work.
- Correct native inline/scoped-selector priority, cleared component themes, concrete CSS border/radius/shadow handling, physical Portal style ownership, rem-root calibration and text alignment. Register the Android platform-default font alias while retaining custom-family semantics and the documented older-Android fallback.
- Add internal ordered Fabric observation and guarded structural-style preparation with lease cleanup, retained memo/styled roots, text-source provenance and generated-binding verification. This infrastructure does not complete public CardContent/Actions structural CSS or first-paint/Portal sibling behavior.
- Expand scoped iOS/Android checks for native geometry, normal/enlarged text, live direction and policy changes, state/refs, focus, supported keyboard delivery, accessibility-tree exposure and Portal composition. Keep unavailable hardware-key phases, physical IME/screen-reader behavior and wider device matrices explicit.
- Record optimized iOS simulator CPU/memory workloads for Paper, FormGroup, ListItemAvatar and ButtonGroup. These scoped measurements do not establish calibrated physical-device input/scroll performance or an isolated optimization target.
- Add a searchable catalog index, grouped examples, retained search, Android return navigation, responsive chart previews and compact large-text headers/layout inspectors.
- Add a full offline-capable local CI preflight, bounded declaration compiler memory, strict unused-code checks, archive consumers and separately reported hosted gates. Persist upstream detection off the protected development branch; detection does not promote verified support.

**Upgrade:** update every used scoped package together, keep `@altroo/mui-native-host` as a direct app dependency, install `react-native-svg` directly for Material, and rebuild iOS/Android. React Native **0.88.1** is required in JavaScript and the native binary, with React 19.3.0 and the matched Expo SDK 58 baseline. A JavaScript reload or Expo Go cannot install the native changes. See [upgrade instructions](docs/installation.md#upgrade-from-007-prealpha0).

Community X remains an experimental subset; no Pro/Premium source or paid-only parity is introduced. Shared-cache CSS insertion-order compatibility remains open in [#127](https://github.com/Altroo/mui-native/issues/127), alongside the documented keyboard/input investigations [#55](https://github.com/Altroo/mui-native/issues/55) and [#58](https://github.com/Altroo/mui-native/issues/58). No newly detected upstream version is certified by this release. Coverage percentages remain unchanged.

## 0.0.7-prealpha.0

All nine scoped packages remain aligned on the `prealpha` channel. This update adds real native implementations and corrections; full MUI/MUI X compatibility and verified alpha gates remain incomplete.

- Add Autocomplete and its headless hook, including mapped/multiple values, filtering, grouping, renderers, slots and original root/deep imports.
- Add the managed native text editor for Material inputs and Autocomplete, guarded native tag navigation/software deletion, and nested Dialog Escape ownership corrections.
- Add retained native Collapse height/width transitions, measured timing, lifecycle/slot/ref contracts and interruption handling.
- Add matched cold-editor diagnostics, scoped iOS/Android interaction checks and Popper release-benchmark collection tooling. The tooling does not establish a calibrated performance result.
- Require direct scoped IDE inspection/export/review, and reject coercible nonstring hashes in upstream source metadata.

**Upgrade:** update all used scoped packages together, keep the native host as a direct app dependency and rebuild iOS/Android. The managed editor requires React Native **0.88.1** in both JavaScript and the native binary. An older 0.0.6 preview binary cannot supply its Fabric descriptor. See [installation](docs/installation.md#upgrade-from-006-prealpha0).

Scoped emulator and installed-consumer checks do not complete physical-keyboard/IME, screen-reader, font/RTL or calibrated release-performance validation. The intermittent input investigation and extended iOS keyboard delivery remain open in issues [#58](https://github.com/Altroo/mui-native/issues/58) and [#55](https://github.com/Altroo/mui-native/issues/55). No new upstream version is certified by this preview; Community X/icon scope is unchanged.

## 0.0.6-prealpha.0

First public pre-alpha release line. All nine packages share the same version and use the `prealpha` dist-tag.

- Expose the current Material/theming/native-host subset and optional Community X/icon prototypes through installable packages.
- Include opt-in original-import routing, native TypeScript mappings, native host sources/autolinking/codegen, and MIT/upstream distribution notices.
- Add package READMEs and registry/local-archive installation instructions.

No new upstream release is certified by this publication. Full component contracts, native/accessibility matrices, bare React Native device installation and calibrated performance remain open. Native host source and its 0.0.5 wire protocol are unchanged; consumers must build the matching native app.
