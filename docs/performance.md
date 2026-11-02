# Performance contract

The public API remains React/TypeScript and MUI-compatible. Rendering uses React Native views on iOS and Android. Rust is an optional implementation tool for measured CPU bottlenecks, not a prerequisite or a planned wholesale rewrite.

## Measure before expanding

Every component family must have a representative workload and a release-build baseline before it is promoted from prototype to verified support. Record device/OS, build mode, commit, dataset, warm-up and repetitions with the results. Development-mode Expo Go and a simulator are useful for interaction checks, but do not establish production performance. React Native recommends measuring in [release builds](https://reactnative.dev/docs/performance#running-in-development-mode-devtrue).

Compare the compatibility component with a plain React Native equivalent on the same device. Track tap-to-feedback and input latency, dropped frames, JS/UI thread work, initial render, peak/settled memory and installed size. Report p50/p95 and worst-case samples, rather than one average. Store reports locally first; use no paid test service or cloud build.

Initial targets, pending calibration on documented physical devices:

- Local input and selection feedback p95 below 100 ms.
- Smooth scrolling at the device refresh rate; a 60 Hz display has a 16.67 ms frame budget, and 120 Hz has 8.33 ms. Record dropped frames rather than claiming smoothness from appearance alone.
- No sustained memory growth after repeated navigation, dialog and selection cycles.
- Flag a repeatable regression above 10% against the same-device baseline for review. Absolute input and frame targets still apply.

Workloads: ordinary forms and dialogs; a 10,000-row/50-column grid with two-axis scrolling; a 1,000-row editing scenario once editing exists; a 10,000-node tree; and charts with 1,000/10,000 points. Virtualize visible content, avoid unnecessary renders, reuse stable styles/data, and keep expensive computation off the input path. Benchmark the algorithms separately to locate hotspots, but do not label desktop microbenchmarks as mobile performance results.

## When Rust makes sense

Rust supports [iOS and Android compilation targets](https://doc.rust-lang.org/rustc/platform-support.html). Candidate work includes large-data filtering, aggregation and chart geometry if profiling shows these dominate latency. Keep the MUI-facing component API in TypeScript and hide any native implementation behind a narrow module interface.

Before adopting Rust, compare optimized JavaScript with the native prototype using the actual dataset. Include call/serialization costs, threading, memory, binary size, build time and installation complexity. Calling native code synchronously can still block interaction. Require an end-to-end improvement large enough to justify the extra maintenance. A custom native module needs a development/release build; the stock Expo Go application cannot load arbitrary native code. See [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

No performance target has been certified for this pre-alpha. The native crash encountered during development reload on 2026-11-02 also requires follow-up before any stability claim.

References: [React Native performance](https://reactnative.dev/docs/performance), [Rust platform support](https://doc.rust-lang.org/rustc/platform-support.html), [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).
