# Native positioning engine

This internal foundation ports the positioning and modifier algorithms used by Material UI 9.5.0's Popper. It is part of the unfinished [Popper integration](https://github.com/Altroo/mui-native/issues/39). The public native `Popper` import is not implemented yet; unsupported imports continue to fail explicitly. Autocomplete remains unfinished.

The engine accepts native measurement snapshots through a platform adapter. It does not create DOM objects or a WebView, import the browser Popper runtime, request editor focus, or add a modal window. Its implementation lives under `packages/material/src/popper`; these are internal modules, not supported package entry points.

## Implemented engine contracts

- All fifteen placement names, original auto/fallback ordering, offset callbacks, flip variations, overflow prevention and tether calculations, optional native arrow geometry, hide metadata and native positioning styles.
- Modifier merging by name, dependency and phase ordering, per-cycle data and resets, custom modifier functions/effects, `setOptions`, synchronous `forceUpdate` when native bounds are synchronous, batched promise-based `update` and idempotent `destroy`.
- Native adapters may return asynchronous measurements. Generation guards reject stale reads after newer updates, option changes, disconnection or destruction. Asynchronous errors are reported by the adapter; invalid native measurements, non-finite positioning and unbounded modifier resets fail explicitly.
- Cleanup attempts every registered effect, releases returned effects during reentrant destruction and prevents effect registration after destruction. These are explicit native lifecycle safeguards.

`viewport` and `document` are separate bounds. A missing clipping-parent rectangle is represented by `null`; it does not imply viewport clipping. This distinction preserves source behavior when a caller selects the document root boundary. Disjoint clipping intersections retain signed edge distances for overflow calculations.

Native styles use React Native absolute positioning, numeric insets and translation transforms. The source `strategy` value remains available to native measurement adapters; browser CSS positioning and DOM selector semantics require native integration decisions. Native arrow options accept a View instance. A DOM selector is rejected. `applyStyles` is a platform publication callback; it does not mutate browser styles.

## Evidence and remaining integration

The source artifact is the latest stable MIT `@popperjs/core` 2.11.8 observed in the official npm registry on 2026-11-03. Its exact integrity, license and source-file hashes are retained in `upstream/native-positioning.json`. The implementation adapts that source rather than depending on the browser runtime. `scripts/reference/popper.mjs` verifies the pinned archive against the installed original reference before building the browser probe. An existing source record cannot be silently replaced by that script.

`tests/fixtures/mui-popper-geometry-9.5.0.json` records 88 actual original Chromium cases at 390 by 844. Native model comparisons check placement, modifier order/data, attributes, arrows and resolved positioning styles. They cover all placements, boundary and tether options, offset/rounding callbacks, oversized content, explicit and disjoint boundaries, reference clipping, document bounds and fixed strategy. Separate tests cover update batching, effect cleanup, cancellation, disconnected nodes, reset limits and invalid geometry. These are algorithm and model checks, not physical native interaction or performance measurements.

The next integration needs actual native anchor and clipping observations, measured Portal coordinate conversion, root slots/defaults and refs, open/keepMounted/transition lifecycle, automatic native updates, and installed-consumer imports/types. That work must preserve editor focus, original web resolution and the public MUI composition contract. Native observation is intended to reuse Portal's existing native frame tracking so ordinary native anchors do not require JavaScript frame polling. Physical iOS/Android clipping, transforms, touch, keyboard, accessibility and calibrated release-performance gates remain open.
