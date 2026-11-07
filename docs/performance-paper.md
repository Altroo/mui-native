# Paper optimized workload

This finite fixture compares public Paper with a direct React Native View control in the same catalog binary. It has not yet recorded native performance results. The functional Paper contract scene remains separate; debug UI tests do not establish Release performance.

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
