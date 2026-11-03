# Contributing

Read ROADMAP.md, docs/compatibility.md and the pinned upstream contract first. Use one focused change with a concrete native behavior, its supported props and an honest compatibility classification.

Use Node from .nvmrc, pnpm from package.json, then `pnpm install --frozen-lockfile`, `pnpm check` and `pnpm format:check`. Native behavior changes also need catalog scenarios and actual device/simulator evidence appropriate to the change. Unit tests cannot establish accessibility or performance parity.

`pnpm lint` runs ESLint with zero warnings allowed for JavaScript, MJS and CJS, then the current TypeScript compiler for TS/TSX. TypeScript checks unused imports, locals, private declarations and parameters across library code, tests and the catalog. Installed-consumer fixtures also enable unused-code checks. `pnpm check` starts with this gate, and CI runs the same command before package-consumer checks. Generated output, dependencies and immutable upstream snapshots are excluded from source linting.

Review WebStorm inspections on changed source files before delivery. The project supplies `eslint.config.mjs`; TypeScript checks use the project's compiler. Keep exported library APIs even when examples do not consume them. A leading underscore is reserved for intentionally unused callback parameters whose signatures must be retained.

Preserve MIT notices for reused source and register source commit/path/hash in the provenance manifest. Do not copy commercial code or implement paid-only parity. New dependencies need license review. Keep upstream reference updates separate from claims of native support.

The source is a public pre-alpha. Package publication requires the reviewed release gates in ROADMAP.md. Discuss upstream contributions separately; this repository does not claim MUI affiliation.
