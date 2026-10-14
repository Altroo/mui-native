# Upstream operations

`upstream/state.json` separates `latestDetected`, `candidate`, `portedAndVerified`, and `releasedSupport`. Only the first two may be changed by automation. Immutable baselines record npm integrity, source commit, published license hash, API hash manifest, and copied source paths. API hash manifests are separate files so the mutable state remains small.

Run `pnpm upstream:check` with a GitHub token permitted to read public releases/advisories. Without authentication GitHub may reject advisory requests. `node scripts/upstream/detect.mjs --registry-only` is a limited local check, cannot prepare candidates, and does not advance committed state. Reports and errors go to `artifacts/upstream/`.

The Actions workflow runs at 07:17 and 19:17 UTC and supports Run workflow. Scheduling is best effort. Inspect Actions after failures; the last-successful dashboard timestamp stays unchanged. Retry after API/rate-limit failures. Detection must finish across all packages before state can advance.

The writer deduplicates issues across open and closed issues by repository/source release, and candidates by family/channel/major. It only updates generated candidate files, preserving other files on a human-edited branch. Existing candidates retain intervening releases. Closed unmerged candidates require maintainer triage; they must not be mistaken for completed ports.

Candidate JSON includes source commits, npm integrity, changed/removed API declarations, eligible file paths, comparison links, and port tasks. It does not automatically translate implementation changes. License changes, missing license text, or potentially truncated comparisons block candidate preparation pending review. Commercial packages are outside the allowlist.

Detection has read-only repository permissions. Preparation has contents/issues/pull-requests/actions write permissions. Candidate validation has read-only contents access and no publishing secrets. `workflow_dispatch` explicitly starts CI because token-generated PRs may not emit normal workflow events. Enable Actions' ability to create pull requests in repository settings before the first candidate needs it.

No release workflow currently publishes to npm. Verified and released support require reviewed native evidence. Baseline refresh is a maintainer action; never overwrite provenance casually. Runtime/tooling upgrades remain separate from upstream MUI changes.

Review schedule health monthly. GitHub may delay/drop scheduled runs and disables schedules in public repositories after prolonged inactivity. A pinned dashboard and an old timestamp indicate the need to inspect Actions, not that the project is current.
