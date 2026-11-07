# Contributing

Read ROADMAP.md, docs/compatibility.md and the pinned upstream contract first. Use one focused change with a concrete native behavior, its supported props and an honest compatibility classification. Work from a focused feature or fix branch, link the relevant issue, and keep commits scoped. Open a pull request with the resulting behavior, compatibility limits and validation evidence. Resolve review findings and pass the required checks before merging.

Use Node from .nvmrc, pnpm from package.json, then `pnpm install --frozen-lockfile`, `pnpm check` and `pnpm format:check`. Native behavior changes also need catalog scenarios and actual device/simulator evidence appropriate to the change. Unit tests cannot establish accessibility or performance parity. The [native catalog testing guide](docs/native-catalog-testing.md) provides reproducible Android interaction checks and explains the evidence they establish.

`pnpm lint` runs ESLint with zero warnings allowed for JavaScript, MJS and CJS, then the current TypeScript compiler for TS/TSX. TypeScript checks unused imports, locals, private declarations and parameters across library code, tests and the catalog. Installed-consumer fixtures also enable unused-code checks. `pnpm check` starts with this gate, and CI runs the same command before package-consumer checks. Generated output, dependencies and immutable upstream snapshots are excluded from source linting.

Consumer fixtures resolve native declaration output in this checkout. Run `pnpm build` before editing them, then `pnpm typecheck:consumer` to check every fixture locally, including expected rejection cases. `pnpm check` runs this gate after building. `pnpm test:consumer` separately installs fresh archives and replaces the workspace mappings with installed-package mappings; both checks are required.

Before delivery, review maintained source, tests, scripts and consumer fixtures using the project lint, compiler and test commands. Resolve actionable errors, warnings and unused private code. Preserve exported library APIs and intentional compiler-negative fixtures, and record why a platform or reference limitation remains. Editor-specific inspection is optional and does not replace the configured checks.

The project supplies `eslint.config.mjs`; TypeScript checks use the project's compiler. Compiler-only consumer fixtures are documented in [their guide](fixtures/native-consumer/README.md). A leading underscore is reserved for intentionally unused callback parameters whose signatures must be retained.

Preserve MIT notices for reused source and register source commit/path/hash in the provenance manifest. Do not copy commercial code or implement paid-only parity. New dependencies need license review. Keep upstream reference updates separate from claims of native support.

The source is a public pre-alpha. Early pre-alpha previews follow the distribution checks in ROADMAP.md and docs/releases.md. Verified alpha/stable publication requires the complete reviewed release gates in ROADMAP.md. Discuss upstream contributions separately; this repository does not claim MUI affiliation.

Before pushing, review comments and automated diagnostics, then run the blocking lint/unused-code checks plus the affected tests and builds. Explain nonobvious coordinate spaces, ownership, cancellation and native/API constraints; use JSDoc for public contracts where it helps callers. Keep comments clear, organized and consistent with the final implementation. Resolve actionable warnings, unused imports/private code and stale explanations before delivery.

Newly authored implementation files may use an Altroo and contributors copyright header with `SPDX-License-Identifier: MIT`, consistent with LICENSE. Preserve all required upstream copyright and license notices in adapted files, identify the native adaptation, and retain its provenance. Contribution reviews cover these comments and notices as well as behavior and architecture.
