# Validation record

Date: 2026-10-14. Status: pre-alpha prototype.

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

For reproducible commands and project scope, see [ROADMAP.md](../ROADMAP.md).

## 2026-11-02 upstream preflight

- Fixed the npm HTTP 406 by using host-appropriate Accept headers; verified the exact formerly failing endpoint returned the expected package. GitHub pagination follows Link cursors.
- Preview release matching checks immutable source manifests when release notes omit the package version. The full local scan succeeded for all nine packages and detected 15 releases.
- 42 tests passed: 17 Jest tests and 25 Node tests. Type checking, all package builds, installed-tarball consumer checks and formatting passed.
- The real report passed an in-memory publisher simulation: five issues, zero PRs, zero CI dispatches and zero network writes. Synthetic scenarios covered eligible candidates, disabled draft creation, missing permissions, retries, rejected state writes, preservation of human files and unchanged verified/released support.
- The bundled create/approve-PR setting stays disabled. The active workflow requests only contents/issues write permission and creates update issues for manual candidate PRs.

Remote verification after local preflight:

- [Upstream Updates #39](https://github.com/Altroo/mui-native/actions/runs/41432931185) succeeded in 1m 30s. Detection took 53s and issue preparation took 21s.
- [Validate #3](https://github.com/Altroo/mui-native/actions/runs/41432854538) succeeded in 1m 3s on implementation commit `2428f67`.
- Four release-review issues and the [Upstream Updates dashboard](https://github.com/Altroo/mui-native/issues/5) were created. No PRs or candidate CI runs were created.
- Bot commit `d08b231` advanced detection state. All immutable baselines, candidate fields and verified/released support fields were compared against the previous state and preserved; no version gained a support claim.
- The bundled create/approve-PR setting and default read-only workflow permissions were rechecked and remain unchanged.

Native interaction, Android and full compatibility gaps listed above remain unchanged. Automatic PR creation is intentionally disabled; its synthetic tests do not establish a live candidate lifecycle.
