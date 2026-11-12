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

## Scrolling behavior, 12 November 2026

The [scroll result](../compatibility/evidence/native-button-group-scroll-ios-2026-11-12.json) records four Release XCTest cases on the existing iPhone 18 Pro / iOS 27.0 simulator: MUI and Native View modes, each scrolling toward the end and back toward the start. All four passed. Each case uses one discarded warm-up and three reported samples, for sixteen fresh cohorts of 100 groups with two real actions per group.

Native row rectangles must move at least half a viewport while the viewport itself stays fixed. This rejects a gesture that only moved the enclosing catalog. The row bounds settle before and after each measured gesture. Lifecycle receipts require 100 live root ref leases and zero root cleanups. Native accessibility queries check all 200 action counters before and after the interval: the seeded first action remains at one and every other action remains at zero. Coordinate gestures must not accidentally activate another row. These checks establish the recorded gesture/state behavior, rather than physical UIView pointer identity or universal gesture coverage.

The SDK exported twelve positive scrolling/deceleration duration samples. It returned no hitch or frame samples despite the requested hitch metric. A separate bounded Animation Hitches recorder probe explicitly reported that Hitches is unsupported on this simulator platform. The result therefore keeps the performance gate **incomplete**, hitch telemetry **missing**, and input latency **unmeasured**. Scroll duration describes the gesture/deceleration interval; it is not a component speed, frame-rate or smoothness score. The earlier CPU/memory result remains a separate source snapshot.

## Scroll collector and report checks

Use the same Release/source/installed-artifact preflight described above. Run the following methods serially, with `-parallel-testing-enabled NO` and `-maximum-concurrent-test-simulator-destinations 1`:

- `testButtonGroupRNScrollTowardEnd`
- `testButtonGroupMUIScrollTowardEnd`
- `testButtonGroupRNScrollTowardStart`
- `testButtonGroupMUIScrollTowardStart`

The collector requests the current SDK's combined scrolling/deceleration metric and the app-scoped [XCTHitchMetric](https://developer.apple.com/documentation/xctest/xcthitchmetric). A passed test alone does not establish that either requested metric was collected. Keep the unmodified native exports, build/source records, installed-artifact checks and restoration receipt locally.

Export the native summary, attachments and metric values to a run directory:

```sh
xcrun xcresulttool get test-results summary --path "$MUI_SCROLL_RESULT" > "$MUI_SCROLL_RUN/summary.json"
xcrun xcresulttool export attachments --path "$MUI_SCROLL_RESULT" --output-path "$MUI_SCROLL_RUN/attachments"
xcrun xcresulttool get test-results metrics --path "$MUI_SCROLL_RESULT" --compact > "$MUI_SCROLL_RUN/metrics-raw.json"
node scripts/performance/button-group-scroll-ios.mjs \
  --run "$MUI_SCROLL_RUN" --build "$MUI_SCROLL_BUILD_RECORD" \
  --output "$MUI_SCROLL_REPORT"
```

The run directory also needs its actual `run.json` preflight/restoration record. It contains the executed XCTest `command`, `exitCode`, `sourceId`, `nativeConfiguration`, `nativeAppExecutableSHA256`, `bundleSHA256`, `swiftDriverSha256`, `installedArtifactVerified`, `installedArtifactVerifiedAfterTest` and `originalSessionRestored`. The build record contains the actual build `command`, `exitCode`, `sourceId`, `appExecutableSHA256`, `bundleSHA256`, `swiftDriverSha256` and `sourceUnchangedDuringBuild`. Record verification flags only after performing the build, installed-byte and restoration checks; the report reader cross-checks these records but does not perform those operations for you.

The reader requires all four cases, one unretried serial execution, sixteen distinct phase receipts, increasing native cohort samples, matching device/artifact identities and real movement/state guards. Its shareable output omits local paths and device identifiers. `--require-hitches` additionally rejects exports with no hitch telemetry; it correctly rejects the duration-only simulator result above. Collecting hitch data alone would still not establish input latency or calibrated physical-device performance. Neither the collector nor this result changes the component coverage stage.
