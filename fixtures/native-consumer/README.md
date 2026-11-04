# Native consumer type fixtures

These handwritten TSX modules are compiler entry points for the library's public API. They exercise root/deep imports, native refs and events, theme/module augmentation, generic inference, and expected rejection cases. The compilation harness loads every TSX file through this directory's `tsconfig.json`; application runtime imports are not required.

Run `pnpm build` followed by `pnpm typecheck:consumer`. `pnpm test:consumer` separately installs fresh package archives and compiles the same fixtures with installed-package mappings. Keep both gates passing.

Exported examples and `@ts-expect-error` cases are deliberate test coverage. Review whole-program unused-symbol findings with that compiler role in mind. Remove actual unused imports and private code, preserve public contracts, and keep the expected-error directive tied to the operation it tests. The compiler's unused-code checks remain enabled.

These maintained fixtures belong in source inspections. Generated archive-consumer copies under `.cache/consumer` and generated reference data under `tests/fixtures` do not.
