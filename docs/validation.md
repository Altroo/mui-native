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
