# Native layout-root workload

The maintained workload compares FormGroup and ListItemAvatar with an equivalent React Native View root. Both modes retain the same public FormControl and List/ListItem scaffolding, text, final styles and update sequence. The common scaffolding isolates the wrapper's incremental work in that application.

Each cohort mounts 100 rows and advances sixteen epochs. Four independent bits change row alignment, inherited error, theme and native inline geometry. Stable keys and actual root refs must survive every update. Receipt readiness describes committed React rows; the iOS collector additionally waits for row zero's native text and 44/52-point frame. It does not claim that every GPU frame has finished rendering.

## Current FormGroup run

The [10 November FormGroup result](../compatibility/evidence/native-form-group-ios-2026-11-10.json) captures the catalog source used in the editor integration, with actual Release compiler settings, installed app executable and bundled JavaScript identity verified. Both Swift 6 XCTest methods passed on the existing iPhone 18 Pro / iOS 27 simulator at the normal OS text size. This run selects FormGroup only.

| Measured root | Mean app CPU, seconds | Mean peak physical memory, kB |
| ------------- | --------------------: | ----------------------------: |
| Native View   |                 7.549 |                       107,203 |
| MUI FormGroup |                 8.165 |                       118,208 |

Each mode retained 100 roots through sixteen acknowledged native updates, for 1,600 completed row updates and zero root cleanups per cohort. The result includes one discarded warm-up and three measured cohorts per mode. It retains selected lifecycle fields from all eight native validation receipts and the exact three CPU and memory samples per mode.

The MUI variant used more app CPU and peak memory in this run. Whole-app totals include native accessibility acknowledgements, and the fixed MUI-first order and three samples limit what can be attributed to the wrapper. These measurements do not establish a change from the earlier snapshot, a leak, input latency, scrolling, mount cost or physical-device performance.

## ListItemAvatar run

The [11 November ListItemAvatar result](../compatibility/evidence/native-list-item-avatar-ios-2026-11-11.json) uses the fingerprinted catalog from the recorded source snapshot. Both XCTest methods passed on the iPhone 18 Pro / iOS 27 simulator at the normal OS text size. The verified Release build used Swift `-O`, native `-Os` and production Hermes JavaScript. The installed app matched the build before measurement.

| Mode               | Mean app CPU (seconds) | Mean peak physical memory (kB) |
| ------------------ | ---------------------: | -----------------------------: |
| Native View        |                  8.294 |                        131,167 |
| MUI ListItemAvatar |                  8.582 |                        131,238 |

The collector ran MUI first, then Native View. Each mode completed one discarded warm-up and three measured cohorts of 100 retained roots and 16 acknowledged updates. The figures describe whole-app CPU and peak physical memory, including the native acknowledgements. Three samples in fixed order do not establish a regression or improvement over the earlier snapshot, input latency, mount cost, scrolling, leaks or performance on physical hardware.

## Earlier optimized simulator run

The [machine-readable result](../compatibility/evidence/native-layout-roots-ios-2026-11-05.json) records the exact local build fingerprint and executable/bundle hashes. Swift used `-O`, C/C++ used `-Os`, and the installed executable and bundled JavaScript matched the reviewed artifacts. The collector rejected development JavaScript, a missing Hermes runtime, an unexpected source fingerprint or invalid lifecycle counts.

The run used iPhone 18 Pro / iOS 27.0 simulator and the iPhoneSimulator 27.1 SDK. Each mode used one discarded warm-up and three reported samples, with a fresh cohort for every sample. All four native test methods passed. During each measured cohort, 100 roots remained attached with zero root cleanups and 1,600 completed row updates.

| Wrapper        | Measured root | Mean app CPU, seconds | Mean peak physical memory, kB |
| -------------- | ------------- | --------------------: | ----------------------------: |
| FormGroup      | Native View   |                 8.842 |                       123,696 |
| FormGroup      | MUI           |                 9.270 |                       106,914 |
| ListItemAvatar | Native View   |                 9.545 |                       127,618 |
| ListItemAvatar | MUI           |                 9.528 |                       122,528 |

These are whole-app CPU and memory totals across sixteen acknowledged updates. Native accessibility queries contribute work. They are not per-component timings, input latency, frame rates, scrolling results or physical-device benchmarks. Memory units are reported by XCTest. Process-wide peak memory and noisy memory deltas do not establish a memory improvement or absence of leaks.

MUI ran before the Native View mode for each family, and development work continued on the host. The three samples are an early regression record, with limited cross-mode conclusions. Mount cost, long-lived allocation behavior, input/scroll latency and representative physical devices remain separate measurements. The source fingerprint identifies this measured build snapshot; subsequent source changes need their own evidence when they affect the workload.

The separately verified [ButtonGroup workload](performance-button-group.md) adds two real actions per row, cohort-qualified native identifiers and an unmeasured correctness cohort before its metric warm-up. Its reported scope and measurements are separate from the wrapper results above.

## Running the workload

Prepare the native catalog following the [installation guide](installation.md). Open Wrappers, then Workload. The RN/MUI, Form/Avatar/Buttons and Mount/Update controls create a new cohort. New sample resets the current configuration; Advance update keeps its current rows mounted. The visible Ready status alone is not a native timing measurement.

For automated iOS measurements, add [LayoutRootPerformanceUITests.swift](../tests/native/ios/LayoutRootPerformanceUITests.swift) to a UI test target whose application is `dev.altroo.muinative.catalog`. Build the catalog and that test target in Release with verified native optimization settings. The measured workload lives in [LayoutRootBenchmark.tsx](../apps/native-benchmark/LayoutRootBenchmark.tsx); [LayoutRootBenchmarkExample.tsx](../apps/native-catalog/LayoutRootBenchmarkExample.tsx) owns fresh cohort selection.

Before building, fingerprint the current catalog/package sources, actual generated iOS project and actual native host selected by CocoaPods. Set `EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID` to that 64-character SHA-256 value when bundling. Confirm that the build phase uses the intended catalog `ENTRY_FILE` and `PROJECT_ROOT`; a generated project in another checkout otherwise embeds that checkout's application. Retain the input manifest and actual Release build settings locally.

The maintained [iOS input tool](../scripts/performance/source-ios.mjs) checks the installed CocoaPods lock, resolves the actual compiled native host, and fingerprints the catalog entry and current source files. Supply a minimal JSON record containing `CONFIGURATION`, `SWIFT_OPTIMIZATION_LEVEL` and `GCC_OPTIMIZATION_LEVEL` from the actual app target's verified Release build settings. The required values are `Release`, `-O` and `s`.

```sh
mkdir -p .cache/layout-roots
node scripts/performance/source-ios.mjs \
  --workspace "$PWD" \
  --project "$MUI_IOS_PROJECT" \
  --entry-file "$PWD/apps/native-catalog/index.js" \
  --project-root "$PWD/apps/native-catalog" \
  --build-settings .cache/layout-roots/release-settings.json \
  > .cache/layout-roots/source.json
```

`MUI_IOS_PROJECT` is the generated catalog iOS project directory. Keep the settings and source records locally, and use the resulting `sourceId` when bundling. Explicit external project/native-host roots are supported; internal directory redirects, an entry escaping the managed catalog and inconsistent installed Pods are rejected. A new build can have a different fingerprint, including after generated-project changes. The tool does not run Xcode or verify the compiler settings for you.

After building, hash the app executable and bundled JavaScript. Install the app and verify those installed bytes against the build artifacts. Supply these values to the **UI test runner's environment**, including when using a prepared `.xctestrun` file:

- `MUI_BENCHMARK_EXPECTED_SOURCE_ID`: the fingerprint embedded in this exact build.
- `MUI_BENCHMARK_NATIVE_APP_SHA256`: the verified app executable SHA-256.
- `MUI_BENCHMARK_NATIVE_CONFIGURATION`: `Release` after checking the actual build settings.

Those environment values bind and annotate the test; they do not independently authenticate compiler settings. Setting only a terminal environment variable may not propagate it to the UI test runner. Missing values refuse measurement before the app launches.

Use serial execution (`-parallel-testing-enabled NO`) and select one family's RN/MUI pair at a time. The collector uses XCTest's discarded first iteration as its single warm-up and reports three subsequent samples. Keep the native result bundle and validation attachments with their artifact identity. Raw build manifests and logs can contain local filesystem paths; the checked-in result retains a selected summary without those paths.
