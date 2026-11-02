# Upstream operations

`upstream/state.json` separates `latestDetected`, `candidate`, `portedAndVerified`, and `releasedSupport`. Only the first two may be changed by automation. Immutable baselines record npm integrity, source commit, published license hash, API hash manifest, and copied source paths. API hash manifests are separate files so the mutable state remains small.

Run `pnpm upstream:check` with a GitHub token permitted to read public releases/advisories. Without authentication GitHub may reject advisory requests. `node scripts/upstream/detect.mjs --registry-only` is a limited local check, cannot prepare candidates, and does not advance committed state. Reports and errors go to `artifacts/upstream/`.

The Actions workflow runs at 07:17 and 19:17 UTC and supports Run workflow. Scheduling is best effort. Inspect Actions after failures; the last-successful dashboard timestamp stays unchanged. Retry after API/rate-limit failures. Detection must finish across all packages before state can advance.

The active workflow prepares update issues and a dashboard; candidate PRs are created manually. Automatic draft creation is disabled (`PREPARE_DRAFT_PRS=false`), and the workflow has no PR-write or Actions-write permission. Keep GitHub's bundled create/approve-PR setting disabled.

The optional draft writer deduplicates issues across open and closed issues by repository/source release, and candidates by family/channel/major. It only updates generated candidate files, preserving other files on a human-edited branch. Existing candidates retain intervening releases. Closed unmerged candidates require maintainer triage; they must not be mistaken for completed ports.

Candidate JSON includes source commits, npm integrity, changed/removed API declarations, eligible file paths, comparison links, and port tasks. It does not automatically translate implementation changes. License changes, missing license text, or potentially truncated comparisons block candidate preparation pending review. Commercial packages are outside the allowlist.

Detection has read-only repository permissions. Active issue preparation has contents/issues write permissions. Manual candidate PRs use normal read-only validation. The optional automatic-draft path remains tested locally but is inactive; enabling it would require a new explicit decision about the bundled GitHub permission, workflow permissions and CI dispatch. It never approves or merges PRs.

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

The scan reads public upstream sources and writes only local artifacts. The simulator consumes that complete report and executes the real publisher against an in-memory GitHub implementation. It creates no remote issues, branches, PRs, or workflow runs. It checks repeated-report deduplication, human-file preservation and unchanged verified support. The test suite also covers eligible synthetic candidates, missing permissions, failed CI dispatch, rejected state writes and retry recovery. Simulation cannot prove live GitHub permissions or service availability; inspect repository settings before one final verification run. Avoid using repeated hosted runs for debugging.

Preview release notes can omit a published package version. The detector resolves release tags to immutable commits and requires an exact package name/version match in the source manifest. It searches at most ten releases, prioritizing explicit version mentions and publication-date proximity. Unresolved source or HTTP failures stop the scan without advancing state. Repeated source and comparison requests are cached within a scan.
