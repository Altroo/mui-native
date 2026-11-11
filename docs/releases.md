# Pre-alpha distribution

The `prealpha` npm dist-tag is an early testing channel for real, incomplete implementations. It is separate from verified alpha/stable support and does not advance `portedAndVerified` or `releasedSupport` in upstream state.

All nine packages in the current release line use `0.0.8-prealpha.0`. Both `latest` and `prealpha` point to this same pre-alpha after publication; the `latest` tag does not certify alpha/stable support. The first public preview used `0.0.6-prealpha.0`. Public scoped publication is explicit (`access: public`, `tag: latest`), followed by the matching `prealpha` alias; the root workspace and catalog remain private. Native host wire protocol 0.0.5 is unchanged by the package-version alignment.

This update includes the full pinned icon catalog, expanded Material contracts, native styling/font corrections and the intervening fixes. Native interfaces and Android default-font registration require a matching native application rebuild with React Native 0.88.1. See [upgrade instructions](installation.md#upgrade-from-007-prealpha0) and [the changelog](../CHANGELOG.md). Historical validation records describe the source and package availability at the time of each check.

## Release checks

Work from a clean, committed release checkout. Run the standard lint/type/contract/inventory/build/codegen checks, a fresh archive-consumer installation and formatting before hosted CI. Inspect the actual tarballs for aligned versions, public metadata, resolved workspace dependencies, README/LICENSE/NOTICE and native source/autolinking/codegen files. Exclude build output, caches and credentials. Run `npm publish --dry-run --access public --tag latest` against those exact archives and retain their hashes. Complete independent review before publishing.

Publish the exact reviewed archives in dependency order: System and native host, Material, compatibility tooling, then icons and X packages. Use npm authentication for the `altroo` account and the public registry. Set `prealpha` to the same reviewed version for all nine packages; verify both `latest` and `prealpha`, every published version and registry integrity value, then install the registry packages in a fresh consumer. A successful command alone is not verification.

Create a matching Git tag and GitHub prerelease with source commit, changelog, checks and the remaining compatibility/native validation limits. Continue development after this preview; alpha/stable still requires the full roadmap gates.
