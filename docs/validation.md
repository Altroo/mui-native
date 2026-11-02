# Validation record

Status: public pre-alpha prototype. The records below describe scoped checks and unresolved gates. Historical hosted runs preceded the public repository; current runs are available in [Actions](https://github.com/Altroo/mui-native/actions/workflows/ci.yml).

## 2026-10-14 initial prototype

These historical checks preceded the SDK 58 upgrade and do not describe the current public baseline.

Confirmed locally:

- TypeScript and all runtime-package builds.
- 17 Jest tests for native components, style precedence, row identity/filtering/sorting, tree selection, chart domains and strict date/DST parsing.
- 12 Node tests for import mapping, resolver chaining, missed updates, idempotence, channels, major migrations, license blocks, maintenance releases, pagination, HTTP failures, empty dispatch responses and partial-report guards.
- Eight packed packages installed independently. Consumer declarations validated original MUI root/deep imports, theme augmentation and X types. Browser refs and commercial imports were rejected. No React DOM or original MUI packages entered the native dependency graph.
- Native core catalog exported to iOS and Android bundles. The later expanded catalog with X imports bundled and rendered in Expo Go on iPhone 18 Pro / iOS 27.0.

Not established:

- Latest expanded Android bundle, actual Android execution, native interaction flows, accessibility, focus/keyboard/IME behavior, RTL and performance budgets.
- Bare React Native development build and original-MUI browser reference.
- GitHub workflow end-to-end success, issue/dashboard lifecycle and candidate PR validation.
- Complete prop/slot/API compatibility or full support for any upstream version.

The local full upstream scan encountered an unauthenticated GitHub advisory HTTP 403 and did not advance committed state. Verify it with repository Actions credentials. The mutable state remains separate from immutable package/source/license references.

For setup commands, see [installation](installation.md). Project scope and remaining gates are tracked in the [roadmap](../ROADMAP.md).

## 2026-11-02 upstream preflight

- Fixed the npm HTTP 406 by using host-appropriate Accept headers; verified the exact formerly failing endpoint returned the expected package. GitHub pagination follows Link cursors.
- Preview release matching checks immutable source manifests when release notes omit the package version. The full local scan succeeded for all nine packages and detected 15 releases.
- 42 tests passed: 17 Jest tests and 25 Node tests. Type checking, all package builds, installed-tarball consumer checks and formatting passed.
- The real report passed an in-memory publisher simulation: five issues, zero PRs, zero CI dispatches and zero network writes. Synthetic scenarios covered eligible candidates, disabled draft creation, missing permissions, retries, rejected state writes, preservation of human files and unchanged verified/released support.
- The bundled create/approve-PR setting stays disabled. The active workflow requests only contents/issues write permission and creates update issues for manual candidate PRs.

Remote verification after local preflight:

- Upstream Updates #39 (historical run) succeeded in 1m 30s. Detection took 53s and issue preparation took 21s.
- Validate #3 (historical run) succeeded in 1m 3s on implementation commit `2428f67`.
- Four release-review issues and the [Upstream Updates dashboard](https://github.com/Altroo/mui-native/issues/5) were created. No PRs or candidate CI runs were created.
- Bot commit `d08b231` advanced detection state. All immutable baselines, candidate fields and verified/released support fields were compared against the previous state and preserved; no version gained a support claim.
- The bundled create/approve-PR setting and default read-only workflow permissions were rechecked and remain unchanged.

Native interaction, Android and full compatibility gaps listed above remain unchanged. Automatic PR creation is intentionally disabled; its synthetic tests do not establish a live candidate lifecycle.

## 2026-11-02 isolated SDK upgrade delivery

The SDK-only snapshot was reconstructed separately from later component features and installed with the frozen lockfile from the local package cache. Its `pnpm check` passed 17 Jest and 25 Node tests, root/catalog TypeScript and seven runtime builds with 49 public entry points. All eight tarballs passed a fresh installed consumer, including native refs, root/deep imports, theme augmentation and browser/commercial isolation. Formatting passed.

Independent review verified the matched Expo 58 runtime and strict native type migration. It found outdated setup versions and a bootstrap command relying on bundled Corepack; the setup instructions now use pinned pnpm installation through npm and the current runtime versions. Delivery is tracked in [issue #6](https://github.com/Altroo/mui-native/issues/6). This scoped migration does not close native crash, device interaction, accessibility, performance or full compatibility gates.

## 2026-11-02 isolated native controls review

The separate form/calendar increment passed 32 Jest and 25 Node tests, root/catalog types and seven runtime builds with 49 entry points. The eight packed archives passed a fresh installed consumer. Usage is documented in [native controls](native-controls.md), and delivery is tracked in [issue #7](https://github.com/Altroo/mui-native/issues/7).

Independent review found conflicting native readOnly/editable aliases, hidden non-string label text, zero-width horizontal labels and supplied calendar values overriding the provider locale. Seven regression cases failed before correction and passed after correction. Textual labels now include numbers, arrays and fragments, with accessible fallback for unknown rich content. Native input aliases use one final editability policy. Calendar normalization preserves caller dates and follows provider locale changes. Label grow/shrink styles retain their automatic content basis. These checks do not establish native screen-reader or release-performance behavior.

The preceding SDK-only commit `f218060` passed hosted Validate #4 (historical run), and SDK issue #6 is closed.

The follow-up independent review found no remaining actionable defects within this increment. A standalone probe compiled against the installed React Native Yoga engine changed a synthetic horizontal label from 0 dp to its 120 dp content width; column layout stayed unchanged. This is layout-engine evidence, not a simulator screenshot or a performance benchmark. Fresh installed-consumer checks and formatting passed after the fixes.

## 2026-11-02 Actions runtime upgrade

The validation and upstream workflows pin checkout 7.0.1, setup-node 7.1.0, pnpm/action-setup 6.1.0, upload-artifact 7.0.2 and download-artifact 8.0.2 to verified release commit SHAs. All five use the supported Node 24 action runtime; application tests still use the Node version in `.nvmrc`.

A parsed comparison verified all ten action references changed while triggers, runners, commands, permissions, credential persistence, cache settings, artifact settings and disabled automatic PR preparation stayed identical. Independent review checked each pinned action's supported inputs and migration behavior. The named archive remains compatible with the download extraction path; digest mismatch now fails the download.

An isolated frozen-lockfile installation passed 32 Jest and 25 Node tests, including updater publication simulations with no network writes, root/catalog types, seven package builds, a fresh eight-package consumer and formatting. Hosted validation is tracked in [issue #8](https://github.com/Altroo/mui-native/issues/8). Validate does not exercise upstream report transfer; record the next scheduled upstream result separately. No extra upstream dispatch was used for this upgrade.

## 2026-11-02 isolated Button loading delivery

The standalone Button increment passed 44 Jest and 25 Node tests, root/catalog TypeScript, seven package builds with 49 entry points, and the fresh eight-tarball consumer. The consumer exercises loading props through original MUI root/deep imports and rejects an unsupported loading position. Usage and limitations are in [native Button loading](button.md); delivery is tracked in [issue #9](https://github.com/Altroo/mui-native/issues/9).

Independent review found empty conditional icons adding layout space and normal-state opacity overriding theme typography. Four regression cases failed before correction and passed after correction. Follow-up review found no remaining actionable issue and checked 30 empty-icon/loading-position combinations. The isolated System implementation matches the previously delivered baseline. Component trees and style assertions establish retained content structure, not measured native geometry or screen-reader announcements. Device accessibility, RTL, large fonts and release performance remain open.

## 2026-11-02 public source pre-alpha

The public source contains the reviewed SDK 58 baseline, native control/calendar fixes and Button loading increment. It does not include unfinished palette, layout or adaptive-grid work. Eleven focused development commits are retained. Earlier hosted results are historical observations; the public baseline receives its own validation run.

The public baseline passed 44 Jest and 25 Node tests, root/catalog TypeScript, seven builds with 49 entry points, the fresh eight-tarball consumer and formatting.

The installed-consumer harness now verifies that all eight archives retain their exact LICENSE and NOTICE files. The compatibility package includes NOTICE in its distribution allowlist. Public availability does not establish npm release readiness, full compatibility, native accessibility or performance parity.

## 2026-11-02 isolated palette and color delivery

The palette/color/provenance increment passed 228 Jest and 28 Node tests, root/catalog TypeScript, seven builds with 50 entry points, the fresh eight-package consumer and formatting. Installed consumers exercised Palette/PaletteOptions augmentation and root/deep color helpers, rejected browser/commercial imports and retained exact LICENSE/NOTICE contents. Delivery is tracked in [issue #11](https://github.com/Altroo/mui-native/issues/11).

The reference check verified 10 palette, 3 augmentation and 166 color-helper cases against the integrity-checked Material UI/System 9.5.0 artifacts. Independent review compared 225 additional palette inputs, verified all ten adapted-source hashes and installed runtime exports, and found no actionable defects. The source-reuse record stays separate from immutable baselines; changed/removed implementation files appear in upstream review reports without advancing verified support. Existing styling/provider source and upstream support state remain unchanged by this increment.

These checks cover finite JavaScript/type contracts. They do not certify native rendering of CSS color() strings, composited contrast, full styling parity, screen-reader behavior or release performance. See [theming limitations](theming.md).

## 2026-11-02 isolated spacing and responsive layout delivery

The isolated increment passed 312 Jest and 28 Node tests, root/catalog TypeScript, seven package builds with 50 entry points, and a fresh eight-package installed consumer. Consumer checks cover custom BreakpointOverrides augmentation, disabled default-key rejection, spacing argument types, root/deep imports, browser/commercial isolation and exact LICENSE/NOTICE contents. Delivery is tracked in [issue #12](https://github.com/Altroo/mui-native/issues/12); supported APIs and remaining limits are in [layout system](layout-system.md).

The integrity-checked Material UI/System 9.5.0 reference contains 47 spacing cases, six breakpoint configurations and 14 actual sx outputs. It checks spacing helpers, breakpoint strings and responsive ordering across width boundaries. The generator honors repository formatting, and its check mode reproduces the checked-in fixture. Five newly recorded adapted-source hashes and all eight notices were independently verified. Immutable baseline and verified-support fields remain unchanged.

Independent review found two responsive-array defects: null entries left earlier declarations active in the same media branch, and sparse arrays threw during iteration. Three null regressions and a separate sparse-array regression failed before their fixes. Native border/shadow expansion now retains the same null semantics; typography null remains a merge no-op, matching upstream. Follow-up review found no remaining actionable defects and checked 45,000 generated width comparisons plus ten targeted probes. Component tests exercise Box, Stack and styled viewport resizing, Stack sx overrides, and Dialog custom caps/full-screen behavior.

These are finite JavaScript, type and test-runtime layout contracts. Native visual geometry, screen readers, RTL, font scaling, keyboard interactions and measured release performance remain open.

## 2026-11-02 isolated adaptive grid and catalog delivery

The isolated increment passed 345 Jest and 28 Node tests (373 total), root/catalog TypeScript, seven package builds with 50 entry points, formatting and the fresh eight-package consumer. Installed checks exercise original root/deep DataGrid imports, typed card rows, rejection of unknown row fields and invalid layout values, native dependency isolation and exact LICENSE/NOTICE contents. Delivery is tracked in [issue #13](https://github.com/Altroo/mui-native/issues/13). API behavior is documented in [native grid layouts](adaptive-grid.md).

The table remains the default; auto layout uses cards below 600 dp of measured container width. Tests cover the exact boundary, window fallback before measurement, shared client/server models, getters/formatters/custom cells, heading fallback, selection and controlled pagination, empty/loading states, and memoized processing invalidation. The catalog's deterministic 10,000-row invoice data is fictional. Its client search resets pagination and layout changes retain selected IDs.

Independent library review found invalid raw-text card output, missing accessible sort direction, number/string ID collisions in recycling keys, and misleading empty-page ranges. Twenty-one added regression cases failed before correction and passed afterward. Fixes also preserve handled keyboard taps and reset custom card/cell state when a recycled holder changes typed row ID; same-ID local state survives ordinary updates. Persistent offscreen drafts remain application-owned. Follow-up review passed 26 targeted assertions and found no remaining actionable library issue.

Independent catalog review found a minimum-height clamp could overflow an 80-dp region. The screen now measures its complete controls and viewport, keeping the grid finite while allowing the entire invoice screen to scroll when space is insufficient. Resize, zero-height recovery, header growth, outer-offset reset and model preservation have regression coverage. Independent callback probes confirmed the final sizing/identity behavior and cleared the finding. Actual native gesture and keyboard handoff remain unverified.

Offline production bundle exports passed for iOS (818 modules) and Android (817 modules), producing approximately 2 MB Hermes bundles. These are JavaScript bundle checks, not installed release-build or physical-device performance measurements. No upstream support fields were promoted. Performance targets remain unmeasured in the [performance contract](performance.md).

Earlier development-preview evidence, before subsequent palette/layout/grid changes: on iPhone 18 Pro / iOS 27.0 with Expo Go 58.0.7, selected invoices survived table/card switches, page 26-50 survived switching back to cards, client search returned `1-25 of 1667`, clearing restored `1-25 of 10000`, amount sorting changed order, and light/dark appearance was inspected. These observations do not verify the exact delivered revision. Android interaction, current native visual geometry, screen readers, RTL, large fonts and release performance remain open.

A development Expo Go native SIGSEGV and a separate simulator shutdown during keyboard/paste testing remain unresolved historical stability findings. Later interactions did not reproduce them, which does not establish a fix or a cause.

## 2026-11-02 pinned declaration inventory

The inventory increment passed 345 Jest and 55 Node tests (400 total), root/catalog TypeScript, seven package builds with 50 entry points, formatting and the fresh eight-package consumer. Twenty-seven Node tests cover inventory parsing, provenance, report lifecycle and freshness. Cached generation followed by full `pnpm coverage:check` reproduced all eight reports without drift; `pnpm coverage:verify` passed without tarball access. Delivery is tracked in [issue #14](https://github.com/Altroo/mui-native/issues/14), with records and count definitions in [coverage](coverage.md).

The generator checks pinned identity, artifact integrity, MIT license bytes, retained notices and immutable declaration snapshots. It parses upstream declarations as data, preserving conditional import targets, export origins, full direct signatures, modifiers, callback/slot labels and native candidates. Stable Community packages and Scheduler preview remain separate; Chat stays blocked for missing license text. Export-name and direct-member matches remain unverified.

Independent parser review found ambiguous star exports, lost type-only imports, incorrect declaration fallback and condition selection, truncated signatures, lost computed/readonly metadata and invented import-equals origins. Follow-up probes caught method-return fields misclassified as props, omitted parenthesized members, null-condition handling and native source conditions being shadowed by unloaded build declarations. Regressions and actual native-graph checks pass after correction. Material's 112 native root symbols resolve with no unresolved native edges, and shared Theme/Palette candidates retain System package provenance. Upstream external edges and semantic contracts remain unresolved where documented.

Independent provenance review found orphan reports, an input-change race during generation, check/fetch cache writes and missing retained-notice coverage. Generation now rejects changing inputs before output writes, removes only obsolete reports recognized by the previous manifest and refuses unknown reports. Check mode refuses fetching. The offline guard tracks reviewed baselines, source, manifests, mappings, tooling, snapshots and notices, and checks the exact report set plus documentation hashes. Detector-only changes do not invalidate it. Independent probes verified these failure paths and confirmed that hashes cannot promote compatibility claims. Both follow-up reviews found no remaining actionable issue within this inventory scope.

This is declaration discovery and drift prevention, not full semantic or behavioral parity. Inherited/generic types, external dependencies, custom condition semantics, runtime-only paths, device interactions, accessibility, stability and measured release performance remain open. No upstream verified-support fields were changed.

## 2026-11-02 typography themes and native conversion

The typography increment passed 402 Jest and 55 Node tests (457 total), root/catalog TypeScript, seven runtime builds with 50 entry points, formatting and a fresh eight-package consumer. The consumer compiler includes both fixtures and verifies custom/disabled typography variants through original root/deep imports, native custom roots/refs and browser isolation. Cached inventory generation/full checking and offline freshness passed. Delivery is tracked in [issue #15](https://github.com/Altroo/mui-native/issues/15); supported behavior and migration guidance are in [typography](typography.md).

The pinned Material UI/System 9.5.0 reference verifies nine configurations, palette callbacks, custom pxToRem conversion and five typography sx cases. Executed reference entry files are byte-checked against integrity-verified cached artifacts. Source adaptations and required notices are recorded separately from immutable baselines. Public theme values retain CSS units and numeric weights; native conversion follows the complete style cascade. Native system-font substitution, supported-weight rounding and untracked-parent limits are deliberate documented adaptations.

Independent review found and drove corrections to catalog absolute heights, native weight support, input-slot font sizes, CSS-mode variant expansion, root-relative font sizing, text-property partitioning, Button color/default precedence, consumer fixture inclusion, inherited ratio/absolute-height distinctions and nested styled metric handoff. It independently checked 3,000 typography cascade comparisons against original MUI and targeted inheritance/rendering probes. The final focused corrections also restore native Button/IconButton padding precedence. Five targeted cases failed before the final fixes; the additional nested-wrapper regression failed before metadata was retained on the adjusted style object. All now pass in the full suite.

Variant mapping supplies native heading roles and custom text roots receive native props/refs. These are source and component-test contracts. Current native visuals, actual font availability/scaling, screen-reader announcements, RTL, stability and measured release performance remain unverified. No emulator, app reload or Metro operation was used for this increment, and upstream support fields remain unchanged.

## 2026-11-02 default props, slots and shared package contexts

The increment passed 441 Jest and 58 Node tests (499 total), root/catalog types, seven runtime builds with 54 public entry points, formatting and a fresh eight-package consumer. Three consumer fixtures compile, including original provider/hook/utility imports, typed TextField slot callbacks and an explicitly typed mergeSlotProps call with absent external props. Source reference reproduction, cached inventory regeneration/full checking and offline freshness passed. Delivery is tracked in [issue #16](https://github.com/Altroo/mui-native/issues/16); contract boundaries are in [defaults](default-props.md).

The original Material UI/System/Utils 9.5.0 reference covers 20 default-prop cases, four deferred callback combinations and four explicit slot-merge combinations. Native style arrays and callbacks remain ordered instead of becoming numeric CSS keys. Existing Material component families consume their own default configurations. TextField callbacks receive live owner state and preserve native slot IDs when no managed field ID is supplied. Class-name concatenation does not provide a CSS class engine, and full slot mounting/ref composition remains open.

The supporting MIT Utils reference has its own npm integrity, immutable source commit, API snapshot and license evidence. All nine prior package states and their baselines remain unchanged. Detection and publication include its releases and adapted-source changes, while excluding it from native aliases and prepared native candidates. An offline mixed Utils/Material publication regression failed before the allowlist boundary was corrected; issue-only and candidate-mode simulations now pass without real network writes or support promotion. A separate freshness regression checks source-reference metadata and license holds. Resolving its declarations reduces external gaps without certifying compatibility.

Focused review found the publisher mismatch and an absent-external generic declaration error; both were corrected, and follow-up found no remaining actionable issue. An installed runtime identity check also exposed duplicate provider contexts in separately bundled entry points. Packages now transpile shared modules once. Installed root/deep providers, hooks and Material components share implementations; the check failed before the build change and passes afterward. It uses a minimal native-module stub for export identity, so it does not establish device rendering. The review also checked 76 runtime modules and 132 relative references for missing targets.

Actual native interaction, accessibility, RTL, font scaling, unresolved historical crashes and measured release performance retain their device gates. No emulator, app reload or Metro operation was used for this increment. Existing scope remains public pre-alpha, with npm publication gated.

## 2026-11-02 native TextField slots and ref lifecycles

The increment passed 459 Jest and 58 Node tests (517 total), root/catalog types, seven runtime builds with 54 public entries, formatting and the fresh eight-package consumer. Four consumer fixtures compile; installed root/deep TextField, native input adapter and ref helpers share implementations. Pinned reference reproduction, cached inventory regeneration/full checking and offline freshness passed. Delivery is tracked in [issue #17](https://github.com/Altroo/mui-native/issues/17); usage and boundaries are in [native TextField slots](textfield-slots.md).

Five native slots mount distinct root, input-container, editable-host, label and helper components. Tests exercise owner-state updates, inherited form flags, native value/event guards, duplicate callback prevention, styling, accessible naming and refs across replacement/unmount. Callback cleanup returns, stale cleanup, changing ref-list lengths and cleanup/attachment errors have focused regressions. These tests use mocked native instances for imperative ref behavior and establish no device performance or screen-reader result.

The integrity-checked Material UI/Utils 9.5.0 reference covers two structural routing cases, three input-container default-value cases and one ref lifecycle sequence. The independent review found input-container defaultValue was ignored. All three upstream default cases failed before correction; state now initializes from resolved input defaults, including explicit undefined, while later default changes preserve uncontrolled edits. Focused follow-up reviewed the correction. MIT source hashes and notices are recorded without changing immutable baselines or verified support.

NativeTextFieldInput is a composable native adapter, not a complete port of InputBase or the Input variants. Select, floating labels/notches, adornments and remaining component slots are still open. Actual native visuals, keyboard flows, accessibility, RTL, font scaling, unresolved historical crashes and release performance retain their validation gates. No device lifecycle, manual reload, Metro operation or extra hosted dispatch was used.

## 2026-11-02 shared input primitives and adornments

The increment passed 484 Jest and 58 Node tests (542 total), root/catalog types, seven runtime builds with 59 public entries, formatting and a fresh eight-package consumer. Five consumer fixtures compile original imports, custom native hosts, InputBase size/color augmentation and invalid native/DOM usage. Root/deep input and form-hook identities match, and the private TextField bridge is absent from public deep exports. Pinned reference reproduction, cached inventory regeneration/full checking and offline freshness passed. Delivery is tracked in [issue #18](https://github.com/Altroo/mui-native/issues/18); the public subset and native differences are documented in [native inputs](inputs.md).

InputBase, Input, FilledInput, OutlinedInput and InputAdornment share one native engine with the existing TextField adapter. The outline surrounds adornments, while the editable host remains borderless. Tests cover native controlled/uncontrolled values, event precedence, restrictive aliases, stable coordinated form state, context isolation, refs/root padding focus, content-size row bounds, theme defaults/overrides and measured outline gaps. The original Material UI 9.5.0 comparison covers four component routing/event cases and three required/overridden notch labels. Exact source hashes and MIT notices were retained without changing immutable baselines or compatibility support state.

Independent review found theme slot defaults could override TextField's managed value and disabling a focused input did not request native blur or clear TextField slot focus. Three regression cases failed before correction. The host-value guard now runs after defaults/slot merging. Disabling requests native blur for a focused host and clears logical focus immediately; callbacks receive the native event when delivered. Synchronous/delayed event tests and initial-disabled/reenabled state cases pass. Native ref instances and content-size/layout events are mocked for these tests; this is contract evidence rather than actual keyboard or geometry validation. Focused follow-up also found slot-provided disabled state needed the same logical reset. Its delayed-blur regression failed before the additional reset; field- and slot-disabled controls now clear focus before delayed blur, including re-enabling before delivery.

Native TextField labels remain stacked. Floating labels/transitions, complete input/CSS/autofill/validation semantics, multi-input form registration, device rendering/keyboard/accessibility/RTL/font scaling, historical crash resolution and release performance remain open. No device lifecycle, manual reload, Metro operation, verification page or extra hosted dispatch was used, and no new runtime dependency or paid source was added.

A post-push audit found generated text-edge padding could beat a native caller shorthand. Its regression failed before correction. Padding now expands per style layer; default horizontal insets stay on the host except at an adorned side, preserving ordinary geometry and caller overrides. Numeric effective vertical insets participate in multiline row bounds. The correction review also caught root shorthand precedence and double RTL swapping; root layers now normalize their insets, and asymmetric adornments account for the native left/right-swap setting. Both RTL configurations have style regressions. The corrective increment passed 488 Jest plus 58 Node tests (546 total), types, builds, fresh consumers, formatting, pinned references and full inventory checks. Percentage padding, physical RTL geometry and native row sizing remain device gates. Delivery remains linked to issue #18.

## 2026-11-02 native labels, helper text and floating fields

The increment passed 525 Jest and 58 Node tests (583 total), root/catalog types, seven runtime builds with 59 public entries, formatting and a fresh eight-package consumer. Six fixtures compile original imports, field/helper variants, reusable input slots, label/helper augmentation and browser-ref rejection. Installed label/input/form-hook root/deep identities agree. Pinned reference reproduction, cached inventory generation/full checking and offline freshness passed. Delivery is tracked in [issue #19](https://github.com/Altroo/mui-native/issues/19); usage, migration and limits are in [native form labels](form-labels.md).

Sixteen original Material UI 9.5.0 cases compare label/helper state precedence, shrink/variant metadata, required markers and reserved blank lines. The reference also checks the transition default against immutable source bytes and package/license identity. Native tests cover floating/stacked layouts, placeholder focus behavior, automatic IDs, native label activation, scoped names/helper descriptions, multiple helper ID order/removal, style precedence, text refs and native-driver configuration. Animation instances, native refs and layout events are mocked; these checks establish no actual native geometry, smoothness or screen-reader result.

Independent review found enabling reduced motion during a shrink snapped the label but retained its narrow width. The regression failed before correction; snapping now updates both progress and final width, and focused follow-up cleared the fix. Pre-delivery auditing also reproduced a multiple-helper association returning only the last message. A keyed registry now preserves all scoped helpers and resolves the explicit ID list in order. Focused review found text updates could reorder implicit hints; a stable mounted registration now updates its description in place, and the update-order regression failed before that correction. Resource tests verify a shared preference subscription, stale result/event isolation and final cleanup. FormControl applies native margins/full width and diagnoses multiple inputs; caller style overrides retain precedence.

TextField now defaults to floating labels and has a native stacked option. Helper variant follows the MUI field contract; caption/custom typography uses sx/styles. Native IDs/events/refs remain platform APIs. Colors update immediately, label width expands after native shrink completion, and full CSS transition/global browser semantics remain open. Actual native visuals/keyboard/accessibility/RTL/font scaling, historical crashes and release performance remain validation gates. No device lifecycle, manual reload, Metro/verification action, new runtime dependency or paid source was used, and immutable baselines/support fields remain unchanged.
