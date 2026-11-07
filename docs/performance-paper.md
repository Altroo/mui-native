# Paper optimized workload

This finite fixture compares public Paper with a direct React Native View control in the same catalog binary. Exploratory results from an optimized simulator pilot are recorded below. The functional Paper contract scene remains separate; debug UI tests do not establish Release performance.

## Workload and control

The workload lives in `apps/native-benchmark/PaperBenchmark.tsx`; Wrappers, then Paper workload opens its catalog controller. Each cohort mounts 100 roots in an ordinary ScrollView with clipping removal disabled. This is a bounded surface workload, not a virtualized-list benchmark. Both modes use identical authored children, explicit text metrics, ThemeProvider, padding, minimum height and scroll container with automatic content-inset adjustment disabled. The View control supplies equivalent direct native shadows, rounded/outlined surfaces and typed dark gradients. It never calls Paper or the CSS resolver. Its finite gradient alphas are checked against the original 9.5.0 source fixture; surfaces are not flattened to a single paint color.

The initial light elevation 1 stage advances eight times: elevation 0, 8, 24; dark 24, 8; dark square 1; dark square outlined; restored light rounded 1. The same 100 row/root leases must survive all updates. Fresh sample and either mode button create a new uniquely identified cohort, even when selecting the current mode. React commit/ref counts are software receipts, not UIView pointer identity, native allocation counts or GPU completion.

The iOS collector has separate RN/MUI methods for three phases:

- Hot mount: create and acknowledge a fresh cohort inside the measurement. This includes old-cohort removal, controller/input/AX work and native first-row acknowledgement. It excludes application startup and module initialization; it is not isolated or cold mount cost.
- Updates: prepare a fresh cohort outside measurement, then perform eight acknowledged updates without remounting its roots.
- Scroll: prepare a fresh cohort outside measurement, then execute three matched up/down native drag cycles. Short held drags reduce residual momentum. Native first-row displacement/return and fresh scroll-end receipts are required; the driver does not promise a fixed event cadence.

Readiness requires all 100 React rows and ref leases; the collector additionally checks first-row native AX text/frame after each epoch. A fresh cohort must independently match the native viewport padding, inner width and zero scroll origin. Scroll completion compares native AX displacement with raw JS-delivered end-event offsets and requires a settled return. This is independent native geometry acknowledgement, not raster or display presentation measurement. Controls remain outside the workload viewport and no nested contract ScrollView wraps this route. Text scaling remains enabled; this first benchmark records actual RN RTL/swap constants and refuses global RTL or a non-normal RN fontScale instead of changing the OS or capping fonts.

## Release prerequisites

Reuse [the established iOS fingerprint and optimized-build procedure](performance-layout-roots.md#running-the-workload). The existing `scripts/performance/source-ios.mjs` deliberately fingerprints the catalog, actual generated iOS project/Pods/native host and benchmark/package sources. It requires the catalog ENTRY_FILE/PROJECT_ROOT; do not point it at the separate Popper benchmark application. Supply verified Release settings (`CONFIGURATION=Release`, Swift `-O`, C/C++ `s`), embed its 64-character sourceId as `EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID`, and retain the actual source manifest/build settings. The helper records inputs; it does not authenticate Xcode compiler settings for the caller.

Register `tests/native/ios/PaperPerformanceUITests.swift` in the existing catalog UI-test target, using the current Swift 6/iOS SDK. Build the catalog and runner in Release, with production bundled Hermes. Preserve the exact prior app/profile rollback before installation. Verify the installed executable and bundle against the retained Release artifacts; keep app/bundle/runner/collector hashes and the prepared xctestrun record locally. Actual runner discovery/build/installation and native measurements remain separate gates from compiler checks.

Supply these values to the UI-test runner environment, including a prepared xctestrun file:

- `MUI_BENCHMARK_EXPECTED_SOURCE_ID`: the fingerprint embedded in this exact binary.
- `MUI_BENCHMARK_NATIVE_APP_SHA256`: the independently verified installed executable SHA256.
- `MUI_BENCHMARK_NATIVE_CONFIGURATION`: `Release` after checking actual settings.

The collector rejects missing identity, development JS, missing Hermes, unexpected source, row/lifecycle/epoch values global RTL and non-normal RN fontScale. This normal-LTR pilot does not cover RTL performance. Environment annotations alone do not prove build optimization or installed bytes. Run serially with `-parallel-testing-enabled NO`, selecting only one method per invocation when controlling RN/MUI order. For each phase run RN then MUI, then repeat MUI then RN before attributing a difference. XCTest method scheduling is not an ordering guarantee.

Each method requires exactly one discarded warm-up plus three reported samples, with a fresh cohort every invocation. It fails if the installed XCTest protocol does not execute four blocks. Retain the complete xcresult, raw per-iteration CPU/memory measurements and validation attachments, including rejected runs. Report individual samples and conditions; three samples are a pilot, not a calibrated tail distribution.

## Metric limits

`XCTCPUMetric(application:)` and `XCTMemoryMetric(application:)` describe the whole app over each acknowledged phase. The app's handling of input and AX requests contributes; runner-process CPU/memory is excluded. The same instrumentation applies to both modes. Memory metrics do not isolate Paper allocations or establish leak freedom. The fixture collects no per-frame, dropped-display-frame, JS-thread, touch/presentation-latency, installed-size or cold-launch metric. No timers in the JS workload are labelled native timing.

Record device/OS/SDK, simulator versus physical hardware, source/build hashes, mode order, font profile, warm-up/repetition counts, background host load and raw metrics. An optimized simulator result is exploratory and does not certify physical-device performance or the [performance contract](performance.md). Repeatable differences above 10% are review signals after controlling order and conditions, not an automatic success/failure certification. Current NativeHost has no general performance metrics API and requires no new module for this gate. The separate [Android Popper collector](performance-popper.md) is not a Paper collector and its samples must not be relabelled.

## Exploratory optimized simulator pilot

The 7 November 2026 pilot used the iPhone 18 Pro / iOS 27.0 simulator with the iPhoneSimulator 27.1 SDK. The app used Swift 5 language mode and the collector used Swift 6; both compiled with `-O`, with native C/C++ at `-Os`.

All twelve planned phase/order/mode cases passed separately with one test each, zero failures and zero skips. CSV and acknowledgement exports succeeded. These outcome counts do not assert the absence of diagnostics.

Each case has one discarded warm-up and three reported samples. Means below are separate case means; the two orders are not pooled. CPU is target-app CPU time, not elapsed latency. Peak physical memory is the XCTest app metric, not component allocations or leak evidence.

| Sequence | Phase   | Order   | Mode | CPU samples (s)              | CPU mean (s) | Peak physical samples (kB)         | Peak mean (kB) |
| -------: | ------- | ------- | ---- | ---------------------------- | -----------: | ---------------------------------- | -------------: |
|        1 | mount   | forward | RN   | 0.979780, 1.030151, 1.012573 |     1.007501 | 114035.208, 117492.232, 120621.576 |     117383.005 |
|        2 | mount   | forward | MUI  | 1.050703, 1.056560, 1.074359 |     1.060541 | 120179.184, 120965.616, 120162.800 |     120435.867 |
|        3 | mount   | reverse | MUI  | 1.057311, 1.059678, 1.070420 |     1.062470 | 120015.344, 120867.312, 120064.496 |     120315.717 |
|        4 | mount   | reverse | RN   | 1.036100, 1.001261, 1.027347 |     1.021569 | 114690.544, 118114.800, 121211.376 |     118005.573 |
|        5 | updates | forward | RN   | 3.884164, 3.861139, 3.855823 |     3.867042 | 128813.600, 121031.176, 122014.240 |     123953.005 |
|        6 | updates | forward | MUI  | 4.120189, 4.130528, 4.102545 |     4.117754 | 119343.624, 119867.912, 119458.312 |     119556.616 |
|        7 | updates | reverse | MUI  | 4.092482, 4.097486, 4.096397 |     4.095455 | 119654.920, 119966.216, 119982.600 |     119867.912 |
|        8 | updates | reverse | RN   | 3.825808, 3.782733, 3.841773 |     3.816771 | 128453.128, 121047.560, 122227.208 |     123909.299 |
|        9 | scroll  | forward | RN   | 5.486036, 5.444296, 5.427403 |     5.452578 | 100387.312, 103287.280, 106416.624 |     103363.739 |
|       10 | scroll  | forward | MUI  | 5.418347, 5.418485, 5.476182 |     5.437671 | 104581.616, 105613.808, 105122.288 |     105105.904 |
|       11 | scroll  | reverse | MUI  | 5.404824, 5.413399, 5.486558 |     5.434927 | 104565.232, 105581.040, 104810.992 |     104985.755 |
|       12 | scroll  | reverse | RN   | 5.342198, 5.421507, 5.423581 |     5.395762 | 100354.568, 103172.616, 106351.112 |     103292.765 |

The [selected numerical evidence](../compatibility/evidence/paper-performance-ios-simulator-pilot.json) preserves each sample and its original units. Raw result bundles and diagnostic interpretation remain separate from these selected observations.

The measured local source snapshot includes additional catalog scenes common to both modes; it is not represented by the public performance commit alone.

- Public performance source commit: `2677686ead693774051e007300fc08d2d71b4a33`.
- Measured source fingerprint: `c711ca3633ff7dd991cab07c05b87b547fd7b739e9fa25c888382ec4db2cc129`.
- App executable SHA256: `6ef314666770c46e07dff5819fd6edf692ae94f79cd336684939553528b14608`.
- Bundled JavaScript SHA256: `20a281bcc1b36530791f1367ba5ce053c3da0779ff69d857116579e820e88498`.

This normal-LTR optimized simulator trial is exploratory. It measures whole-app CPU/memory with input/AX handling, excluding runner-process CPU/memory. Local builds and test suites were held during collection; existing virtual devices and Metro remained running, and light source editing/browser review continued. Three samples do not establish calibrated tails, physical-device performance, cold startup, GPU/frame behavior, presentation latency or leak freedom. No completion percentage or release status changes.
