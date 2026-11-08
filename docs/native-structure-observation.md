# Native structure observation

This unreleased development work adds an internal Fabric observer for ordered native families. It supports the sibling and direct-child information needed by structural styling. It does not implement CardContent or CardActions styling, and does not change their compatibility status.

The observer is internal to the native host package. Its client and TurboModule are not exported by the package entry point. Application code should continue using the supported Material and System imports.

## Behavior

A subscription watches an existing native tag with a bounded lease identifier. The native adapter retains family identity, compares ordered families in accepted roots, and coalesces dirty records until JavaScript drains them. A pure reorder is a structural change. A layout-only change is not. Records carry a subscription identifier, lease, increasing revision and closed flag; they are dirty hints rather than computed styles or paint snapshots.

The client registers hooks on demand and releases its private connection when its last subscription ends. Diagnostics describe this observer's owned hooks, subscriptions and pending records. They do not count every hook registered with React Native. Registration, stale callbacks, surface generations, callback errors and cleanup have separate regression coverage. The normal test command runs those tests and compiles the production state policy with a host C++20 compiler.

The adapter uses private React Native 0.88.1 Fabric interfaces. The [source baseline](../packages/native-host/structural-observation-baseline.json), existing native-input baseline and build-time checks require the reviewed peer sources. A new React Native version needs a reviewed adapter upgrade and rebuild. Do not bypass the checks or downgrade the runtime. The React Native attribution is retained in [NOTICE](../NOTICE).

## Development build and catalog

Native changes require rebuilding the catalog development app. An older installed binary or Expo Go cannot supply this module. Both platform code generators must retain the existing component descriptors while adding the C++ module provider. Android also verifies its generated autolinking cache. If that check detects stale generated configuration, regenerate that cache and rebuild; changing JavaScript alone cannot link the module.

Open **Wrappers > Structure** in the catalog. The mode control switches between siblings and direct children by remounting a session and releasing its old owner. Start registers the selected node (the target for siblings, its parent for direct children); Next advances through seven authored states; Measure reads actual public native refs and owned diagnostics; Stop releases the subscription. The scene keeps its memoized target mounted while adding, reordering and removing zero-size or hidden siblings, changing only the target width, then restoring the original order and width.

The iOS collector is [StructuralObservationUITests.swift](../tests/native/ios/StructuralObservationUITests.swift), using the existing catalog UI test target. Its separate siblings and direct-children Debug simulator runs each passed all seven stages and the final stopped state on the existing iPhone 18 Pro, iOS 27.0 runtime and SDK 27.1. The target retained its ref lease, measured 40→48→40 points, and produced structural event counts of 1, 2, 3, 4, 5, 5 and 6. Stopping left zero owned hooks, subscriptions and pending records. The saved test result and source/build/installed-binary identities were reviewed separately. Each iOS run retained a QoS diagnostic, and SDK/vendor diagnostics were retained; this is not a warning-free platform claim.

The Android collector is [StructuralObservationScenario.java](../tests/native/android/StructuralObservationScenario.java). Its separate siblings and direct-children SDK 37 arm64 Debug emulator runs each passed all seven stages, with eight screenshots and confirmed cleanup. Native target and parent instances stayed identical, the target measured 40→48→40 dp, and the layout-only change produced no extra structural event. The raw instrumentation result, strict report reader, source/build/installed APK identities and retained artifacts were reviewed separately. Font scale remained 1.0. These are native observations from that run; synthetic reader fixtures and successful builds alone are not runtime evidence.

Prepare and install the existing catalog test APK as described in the [native catalog guide](native-catalog-testing.md), then select the existing device explicitly:

```sh
node scripts/native-catalog/android-popper.mjs run \
  --serial "$MUI_QA_DEVICE" --scenario structure --output structure-siblings-results
node scripts/native-catalog/android-popper.mjs run \
  --serial "$MUI_QA_DEVICE" --scenario structure-children --output structure-children-results
```

Use a new empty output directory. The runner preserves the raw report and screenshots, rejects invalid or failed results, and restores only the catalog app. It does not close the emulator or Metro.

## Remaining boundaries

Both modes have finite normal-text native checks. Switching away from an active observation has software regression coverage; the native mode runs switch before starting a subscription. This is not a native hot-switch result.

These native probes cover stable authored logical-tree states and sampled target geometry. They do not establish literal-text adapter semantics, Portal destination sibling ordering, every cross-surface/runtime lifecycle, physical accessibility, optimized performance or CSS first-paint behavior. Native zero-size families may flatten, so physical subview order must not be substituted for the public logical tree.

An asynchronous dirty callback can arrive after a native frame has been drawn. Correcting padding after that callback is therefore insufficient to claim first-frame CSS parity. Structural styling still needs a pre-layout selection mechanism, explicit semantic origins and Portal destination ownership, reversible style priority, custom-root support and their own native checks. These are implementation gates, not waived device tests.
