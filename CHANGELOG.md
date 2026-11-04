# Changelog

## Unreleased

- Add the native Accordion family, original root/deep imports and class helpers, source-defined expansion/slot/callback priority, native refs and shared ButtonBase/Collapse composition. Scoped device checks do not complete physical accessibility, inherited APIs or performance gates.
- Add direct npm discovery links and relevant package keywords. Keyword metadata takes effect in the next planned publication.

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
