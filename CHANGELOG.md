# Changelog

## Unreleased

- Preserve nested React and nonplain Theme defaults so equivalent theme reconstruction retains custom-root state and refs, while Date, Map, Set and class values retain their identity and methods. Add pinned original-source, getter and replacement regression coverage.

- Add an internal ordered Fabric observer with lease-safe cleanup, guarded iOS/Android providers, native structure probes and installed-archive input checks. Structural CSS, initial paint and Portal sibling semantics remain separate implementation gates; CardContent/Actions status is unchanged.

- Replace the native Card surface prototype with pinned 9.5.0 props/classes, raised/default ordering, native custom roots and reserved styled inputs. Add strict installed Card imports and thirteen-state iOS/Android checks at both text profiles. CardContent/Actions and wider native, physical accessibility, GPU and performance gates remain separate.

- Align Material Box with its pinned 9.5.0 props, classes, native roots, selected themes and style priority. Add canonical className routing, exact-optional installed consumers and eleven-state iOS/Android checks at normal/enlarged text sizes. Browser themes, wider native matrices, physical accessibility and optimized Box performance remain separate gates.
- Add shared native SvgIcon, React-node factories, original root/deep imports, source-ordered theme/paint priority, refs and typed native roots. The full pinned Material Icons artwork/import catalog is implemented; shared SvgIcon rendering gates remain separate. The next Material package requires `react-native-svg` directly in the app.
- Separate native CSS rem root sizing (`cssRootFontSize`, default 16) from MUI's `htmlFontSize` pxToRem calibration. Correct SVG text font binding and authored gradient inline-paint priority, with scoped iOS/Android checks.

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
