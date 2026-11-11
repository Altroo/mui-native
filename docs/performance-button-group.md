# ButtonGroup optimized workload

The [11 November 2026 result](../compatibility/evidence/native-button-group-ios-2026-11-11.json) records 100 retained groups with two real, stateful actions per group. The iPhone 18 Pro simulator ran iOS 27.0 with the iPhoneSimulator 27.1 SDK, a Release build, Swift `-O`, native `-Os` and production Hermes JavaScript. Source, collector, bundle and installed application identities were checked; the original application and normal OS text setting were restored afterward.

| Mode                     | Mean app CPU (seconds) | Mean peak physical memory (kB) |
| ------------------------ | ---------------------: | -----------------------------: |
| Native View + Pressable  |                 20.399 |                        105,925 |
| MUI ButtonGroup + Button |                 24.652 |                        158,392 |

These are whole-app totals across sixteen acknowledged updates. MUI used more CPU and peak memory in this run. Native accessibility acknowledgements contribute work, so these numbers do not isolate styling or rendering cost. Three samples in fixed MUI-first order provide a scoped record, without establishing a general performance ratio or an optimization target.

## Workload and acceptance

Both modes use the same catalog shell, public providers, text and update controller. The flat action style and explicit typography match native geometry and labels; MUI still resolves its real group defaults, variants, disabled context and theme sheets before the authored native styles. The sixteen updates exercise contained/outlined configuration, inherited disabling, light/dark themes and native 48/56-point minimum group heights with 4/8-point radii. This is a custom-styled action workload, rather than default-appearance parity.

Each mode first completes a separate unmeasured correctness cohort. Its seventeen native observations cover the initial state and all sixteen updates: equal action widths, contained bounds, touch heights of at least 44 points, actual enabled/disabled states, coordinate-touch suppression and retained local action state. The machine-readable result retains those rectangles, states and labels.

The collector then discards one metric warm-up and reports three fresh samples per mode: five cohorts per mode and ten overall, with three reported samples per metric and mode. Every cohort retains 100 native group roots with no root cleanups during its 1,600 completed row updates. Actual native frames and current labels acknowledge updates after React readiness. Cohort-qualified native identifiers and receipt identity prevent another sample from satisfying a query.

## Reproducing and interpreting the result

Use the [optimized catalog build procedure](performance-layout-roots.md#running-the-workload). Select **Buttons** in the workload family control. The maintained [workload](../apps/native-benchmark/LayoutRootBenchmark.tsx), [controller](../apps/native-catalog/LayoutRootBenchmarkExample.tsx) and [XCTest collector](../tests/native/ios/LayoutRootPerformanceUITests.swift) implement the scenario. Select `testButtonGroupMUICPUAndMemory` and `testButtonGroupRNCPUAndMemory` serially, with the required source/build preflight and normal OS text size.

Inspect passed, failed and skipped results separately. Reconcile the ten cohort records, both seventeen-state correctness sequences and the exact CPU/peak-memory samples before accepting a run. A build, React Ready status or partial native run is insufficient. The result identifies its actual source snapshot; later runtime changes require new evidence when they affect this workload.

The common full catalog and native accessibility queries contribute to both modes. This run does not measure input latency, scrolling, mounting, leaks, Android, physical devices or every visual variant. Those measurements and the broader [ButtonGroup closure gates](button-group.md#evidence-and-remaining-work) remain open. No package version, tag, release or coverage-stage change accompanies this evidence.
