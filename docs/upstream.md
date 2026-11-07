# Upstream operations

`upstream/state.json` on the default branch is authoritative for immutable baselines, reviewed candidates, `portedAndVerified` and `releasedSupport`. Changes to those records use the normal reviewed pull-request workflow. Baselines retain npm integrity, source commit, published license hash, API hash manifest and copied source paths.

Automation persists only detection telemetry in `upstream/detection.json` on the dedicated `automation/upstream-state` branch: `latestDetected`, `observedVersions` and `lastSuccessfulCheck`. It reads reviewed state from the default branch and overlays those detection fields. It never writes the default branch, copies reviewed support into the telemetry JSON, force-pushes or merges the automation branch. The branch may retain an older source tree from its creation; its source and `upstream/state.json` are never used as reviewed state or executed by the monitor. Do not merge this branch into development. A missing telemetry file bootstraps from the legacy detection fields on the default branch.

Run `pnpm upstream:check` with a GitHub token permitted to read public releases/advisories. Actions supplies `GITHUB_REPOSITORY`; set `GITHUB_REPOSITORY=Altroo/mui-native` for an equivalent local scan. Without that variable, a local scan uses the checked-out legacy detection fields and the simulator exercises first-run bootstrap. Without authentication GitHub may reject advisory requests. `node scripts/upstream/detect.mjs --registry-only` is a limited local check, cannot prepare candidates, and does not advance committed state. Reports and errors go to `artifacts/upstream/`.

The Actions workflow runs at 07:17 and 19:17 UTC and supports Run workflow. Scheduling is best effort. Inspect Actions after failures; the last-successful dashboard timestamp stays unchanged. Retry after API/rate-limit failures. Detection must finish across all packages before state can advance.

The active workflow prepares update issues and a dashboard; candidate PRs are created manually. Automatic draft creation is disabled (`PREPARE_DRAFT_PRS=false`), and the workflow has no PR-write or Actions-write permission. Keep GitHub's bundled create/approve-PR setting disabled.

The publisher rejects automatic draft preparation, including an accidental `PREPARE_DRAFT_PRS=true`. Review upstream updates and prepare candidate PRs manually. Release and security issues keep stable markers so open and closed issues are deduplicated after outages. Detection of a package version does not establish native compatibility.

The report JSON retains source commits, npm integrity, changed/removed API declarations, eligible file paths, comparison links, and review metadata. It does not automatically translate implementation changes. License changes, missing license text, or potentially truncated comparisons block candidate preparation pending review. Commercial packages are outside the allowlist.

Detection has read-only repository permissions. Active issue preparation has contents/issues write permissions. Manual candidate PRs use normal read-only validation. The detection-only publisher never requests PR or Actions-write capabilities and never approves or merges PRs.

No release workflow currently publishes to npm. Verified and released support require reviewed native evidence. Baseline refresh is a maintainer action; never overwrite provenance casually. Runtime/tooling upgrades remain separate from upstream MUI changes.

Review schedule health monthly. GitHub may delay/drop scheduled runs and disables schedules in public repositories after prolonged inactivity. A pinned dashboard and an old timestamp indicate the need to inspect Actions, not that the project is current.

## Local preflight

Run checks locally before hosted workflows and avoid redundant CI runs.

Before a push or manual Actions run, validate locally:

```sh
pnpm check
pnpm test:consumer
pnpm format:check
pnpm upstream:check
pnpm upstream:simulate
```

The scan reads public upstream sources and writes only local artifacts. The simulator consumes that complete report and executes the real publisher against an in-memory GitHub implementation. It creates no remote issues, branches, PRs, or workflow runs. It checks repeated-report deduplication, human-file preservation and unchanged verified support. The test suite also covers a protected default branch, missing permissions, stale reviewed state, telemetry conflicts and ambiguous server failures. Conditional telemetry writes use at most three attempts; a retry requires a read-back proving the original blob is unchanged. A failed response whose intended content is already present counts as success; a different concurrent update fails without overwrite. Permission and protection errors fail immediately. The simulator uses the report's captured input telemetry and no remote writes. Simulation cannot prove live GitHub permissions or service availability; inspect repository settings before one final verification run. Avoid using repeated hosted runs for debugging.

Preview release notes can omit a published package version. The detector resolves release tags to immutable commits and requires an exact package name/version match in the source manifest. It searches at most ten releases, prioritizing explicit version mentions and publication-date proximity. Unresolved source or HTTP failures stop the scan without advancing state. Repeated source and comparison requests are cached within a scan.

## Supporting source dependencies

The monitor also tracks MIT supporting source references separately from native compatibility targets. `@mui/utils` 9.5.0 is pinned with source, artifact, API and license evidence for default/slot prop algorithms. Its releases and adapted source changes enter the same core review channel; detection never creates a native alias or verified support. Existing package baselines remain immutable, and paid packages stay excluded.
