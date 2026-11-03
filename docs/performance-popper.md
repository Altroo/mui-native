# Popper release benchmark

`apps/native-benchmark` is a private workspace fixture for measuring simple Popper positioning against plain React Native. Its application ID is `dev.altroo.muinative.benchmark`, separate from the catalog. It is never packed into the library archives. The first collector supports Android API 31 and later. iOS collection and physical-device calibration remain pending.

## Shared workload

Both modes use identical native anchor, popup, child-owned counter, styles, theme provider, scroll content and event mapping in the same release Hermes binary. MUI uses its native window Popper with bottom-start placement and an eight-point gap. The baseline uses an absolute sibling and a native-driven Animated transform following a known scroll offset. This baseline implements only the simple geometry exercised here. It does not implement Popper flipping, clipping, retargeting, transforms or modifier semantics.

The protocol has one warmup and three measured trials per mode, in `rn,mui,mui,rn,rn,mui,mui,rn` order. Each trial remounts the workload and asserts a zero scroll offset/counter, including consecutive trials in the same mode. It has 20 real injected taps and three native up/down scroll cycles. Drags request 64 points over 400 ms using absolute deadlines, with a 120 ms stationary hold before release and a 120 ms settling pause afterward. Actual move duration and maximum scheduling lateness are recorded; a move more than 40 ms late invalidates the run. Both popup attachment and actual scroll displacement are asserted. These checks add fixed instrumentation work to the scroll phase. The workload covers 20 static rows, not a virtualized grid or large dataset.

Touch events use explicit finger pointer properties and the public `UiAutomation.injectInputEvent` API. Down/up events wait for handling; moves are queued asynchronously to preserve the fixed cadence. A queue acknowledgement does not prove delivery, so the collector independently asserts actual scrolling, retained child state and counter feedback through native `OnDraw`. The report identifies the driver, pointer type and dispatch mode, and the summarizer rejects other protocols. The synchronous, app-scoped driver was tested but could not sustain this cadence. No hidden platform API is used.

The 120 ms hold sends three stationary samples, and a second native offset snapshot rejects continued motion after release. Failed runs retain native target bounds, scroll offsets, dispatch timing and the last anchor/popup rectangles, so a gesture or settling failure cannot silently become a library performance result.

## Build locally

Use the pinned workspace toolchain and an installed Android SDK/JDK. No cloud build, hosted benchmark or Metro server is required. Keep any existing catalog preview running. These commands generate only the separate benchmark project:

```sh
pnpm install --frozen-lockfile
pnpm --filter native-benchmark exec expo prebuild --platform android --no-install
node scripts/performance/android.mjs prepare apps/native-benchmark/android
mkdir -p .cache/popper-performance
node scripts/performance/source.mjs > .cache/popper-performance/source.json
MUI_BENCHMARK_SOURCE_ID=$(node -p "require('./.cache/popper-performance/source.json').sourceId")
EXPO_PUBLIC_MUI_BENCHMARK_SOURCE_ID="$MUI_BENCHMARK_SOURCE_ID" \
  apps/native-benchmark/android/gradlew \
  -p apps/native-benchmark/android --console=plain \
  -PreactNativeArchitectures=arm64-v8a \
  :app:assembleRelease :app:assembleReleaseAndroidTest
```

Initial installation/builds can download pinned dependencies from the free package registries. Add `--offline` to pnpm and Gradle after those artifacts are cached. Use the architecture of the selected device. Set `JAVA_HOME` and `ANDROID_HOME` for your installation. Preparation refuses the catalog and preserves unrelated instrumentation configuration and edits to generated test source. Re-run preparation and fingerprinting after changing source. The fingerprint includes library sources, native host, benchmark app, instrumentation, reporting scripts, root Babel configuration, lockfile and the generated Android build settings and complete application source sets. Generate and prepare the native project before fingerprinting. `baseCommit` is context only: the source fingerprint also covers unpublished inputs. Preserve the manifest with the APK hashes and raw results.

The generated Expo release variant uses a local debug signing key for local installation. This is a non-debuggable release with a bundled production Hermes program, not a distribution signing setup. The collector rejects debuggable applications, development JavaScript, a different fingerprint or engine. It does not request usage access: Android permits storage statistics for the [calling app's own UID](<https://developer.android.com/reference/android/app/usage/StorageStatsManager#queryStatsForUid(java.util.UUID,int)>).

## Run on an explicitly selected existing device

List devices first. Set a serial explicitly, reuse a running emulator or connect a physical device, and do not start or stop another session automatically. Install the release app and its matching test APK from this build. Preserve the exact APKs/hashes used.

```sh
adb devices -l
MUI_BENCHMARK_SERIAL=emulator-5554
MUI_BENCHMARK_OUTPUT=".cache/popper-performance/run-$(date +%Y%m%dT%H%M%S)"
mkdir "$MUI_BENCHMARK_OUTPUT"
cp .cache/popper-performance/source.json "$MUI_BENCHMARK_OUTPUT/source.json"
adb -s "$MUI_BENCHMARK_SERIAL" install -r \
  apps/native-benchmark/android/app/build/outputs/apk/release/app-release.apk
adb -s "$MUI_BENCHMARK_SERIAL" install -r \
  apps/native-benchmark/android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk
adb -s "$MUI_BENCHMARK_SERIAL" shell am instrument -w \
  -e sourceId "$MUI_BENCHMARK_SOURCE_ID" \
  dev.altroo.muinative.benchmark.test/dev.altroo.muinative.benchmark.test.PopperBenchmark \
  > "$MUI_BENCHMARK_OUTPUT/instrumentation.txt"
node scripts/performance/android.mjs summarize \
  "$MUI_BENCHMARK_OUTPUT/instrumentation.txt" "$MUI_BENCHMARK_SOURCE_ID" \
  > "$MUI_BENCHMARK_OUTPUT/summary.json"
```

An instrumentation command can exit successfully despite test failure. The summarizer therefore checks the native completion code, report status, build identity, protocol, trial order and sample completeness. It rejects lost collector reports, including during warmup. Preserve rejected raw evidence, diagnose the cause and use a new output directory for another run. After testing, stop only the benchmark application and return to the catalog if it was the preview in use:

```sh
adb -s "$MUI_BENCHMARK_SERIAL" shell am force-stop dev.altroo.muinative.benchmark
adb -s "$MUI_BENCHMARK_SERIAL" shell am start -n dev.altroo.muinative.catalog/.MainActivity
```

The collector leaves enabled accessibility services intact. It neither opens emulators nor restarts Metro. Record active services, animation settings, device refresh configuration, power/thermal state and other workloads when interpreting results. Use the same device conditions for both modes and repeat comparisons before attributing a regression to the library.

## Interpret the output

The summary uses empirical nearest-rank p50/p95 and worst values. Warmup trials and first-draw frames are excluded from steady-state distributions, while raw samples remain available.

- `tapUpInjectionToCounterOnDrawMs` starts immediately before injecting touch-up and ends when the updated native counter reaches the window's `OnDraw` callback. This includes injection and event processing. The callback runs before drawing; it does not measure display presentation or photon latency.
- `scrollFrameTotalMs` is Android [FrameMetrics TOTAL_DURATION](https://developer.android.com/reference/android/view/FrameMetrics#TOTAL_DURATION). A frame with total duration at least its reported `DEADLINE` is counted as a deadline miss. This is not a count of dropped display frames. Raw arrays contain `[intendedVsyncFromScrollStartNs, totalNs, deadlineNs, firstDraw]`.
- `listenerReportDrops` means [lost metric callbacks](https://developer.android.com/reference/android/view/Window.OnFrameMetricsAvailableListener), not rendering jank. Any nonzero count invalidates comparative output. The collector waits for a post-measurement sentinel frame before removing the listener, so a slow tail frame is not omitted merely because its report is still on RenderThread.
- `instrumentedProcessCpuMs` includes the in-process driver and metric collector. `uiThreadCpuMs` includes main-thread correctness checks. Both cover the scroll phase, including pauses. `jsThreadCpuMs` uses the single React Native `mqt_v_js` runtime thread (or `mqt_js` legacy bridge thread)'s own kernel CPU ticks; a missing/replaced/ambiguous thread gives `null`, never a fabricated zero. Kernel tick granularity limits precision.
- PSS values are snapshots before and after each trial. They do not capture a continuous peak or establish a sustained-growth plateau. Storage statistics cover the whole installed benchmark app with both paths bundled, not an isolated cost of adding MUI.
- `reviewFlags` identifies measured p95 differences above 10%. A flag requires investigation and repeatable evidence. Absence of flags is not certification.

Initial render, cold launch, presentation latency, continuous peak memory, complex Popper workloads, iOS metrics and physical-device calibration remain separate gates in the [performance contract](performance.md). Emulator measurements are exploratory even when the app is a release build.

## Initial Android pilot

The API 37 arm64 emulator completed one production-Hermes pilot with all eight trials, native geometry/child-state checks and zero lost frame-metric callbacks. A subsequent comparison was rejected after four trials because a baseline swipe failed the native displacement assertion. Earlier rejected experiments also exposed input scheduling and post-release settling failures. These rejected runs are retained alongside their source manifests and APK hashes; their samples are not combined with the accepted pilot.

The accepted pilot establishes that the collector can complete this workload. Benchmark repeatability remains unresolved: the failed endpoint does not distinguish lost input from a native scroll reset. It does not establish a Popper regression or justify a performance claim. Two matching React Native JS queue names were observed, so JS-thread CPU remains unknown rather than selecting the busiest thread. iOS collection, physical calibration and the broader performance targets remain unfinished.
