# Native catalog interaction checks

The Android Popper check uses Android's [Instrumentation](https://developer.android.com/reference/android/app/Instrumentation) and [UiAutomation](https://developer.android.com/reference/android/app/UiAutomation) APIs. It exercises the real catalog with native touches and reads actual View ancestry, transforms and unclipped geometry on the UI thread. It adds no application or test-framework dependency. These checks require Android API 29 or later; minimum-version, accessibility-service and hardware keyboard coverage remain separate gates.

## Build the catalog and test APKs

Use the pinned project dependencies and an installed Android SDK/JDK. Generate the native catalog project if it does not exist, then prepare its test source and runner:

```sh
pnpm install --frozen-lockfile
pnpm --filter native-catalog exec expo prebuild --platform android --no-install
node scripts/native-catalog/android-popper.mjs prepare
```

The preparer changes only the generated catalog Android project. It preserves other instrumentation runners and detects manual edits to its generated source. Its source checksum record stays with that ignored project. Repeating preparation is safe; regeneration of the native project may require preparation again.

Build both APKs for the device's ABI, for example arm64:

```sh
cd apps/native-catalog/android
./gradlew -PreactNativeArchitectures=arm64-v8a :app:assembleDebug :app:assembleDebugAndroidTest
```

The outputs are `app/build/outputs/apk/debug/app-debug.apk` and `app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk` under that Android project. Neither command starts an emulator. Use the current compatible SDK/runtime; do not downgrade to make a test build pass.

## Select one device and run

Reuse the catalog's Metro server on port 8081. List connected devices with `adb devices -l` and choose one explicit serial. Install the APKs on that chosen device and forward its connection to Metro, from the repository root:

```sh
export MUI_QA_DEVICE=emulator-5554
adb -s "$MUI_QA_DEVICE" install -r apps/native-catalog/android/app/build/outputs/apk/debug/app-debug.apk
adb -s "$MUI_QA_DEVICE" install -r -t apps/native-catalog/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s "$MUI_QA_DEVICE" reverse tcp:8081 tcp:8081
node scripts/native-catalog/android-popper.mjs run --serial "$MUI_QA_DEVICE"
```

Replace the example serial with the one you selected. The runner never selects a device, installs APKs, opens/closes emulators or restarts Metro automatically. Instrumentation starts the catalog, resetting its in-memory example state. At completion the runner reopens that catalog activity. On failure or interruption it first stops only the selected device's catalog package and confirms its processes ended; if confirmation fails it reports failure and skips restoration.

## Assertions and artifacts

The scenario checks real inherited manager child operations, physical/logical child separation, window and inline popup ancestry, actual horizontal/vertical anchor attachment, native child-button feedback, switch checked-state updates, uniform scale/rotation and reset matrices, popup transform inheritance, explicit boundary containment using unclipped native rectangles, repeated transform resets and closing. It also drags the inner ScrollView in both directions, moves the anchor fully out of its clip and back in window/inline modes, and repeats three reopen/unmount cycles. The shared-note scene also retargets one open popup from stop A to B, removes the actual anchor views while retaining their previous refs, restores them, and returns to A. Its read count belongs to the popup child and must survive retargeting and anchor recovery. Android checks retired React-tag absence, native opacity/touch/accessibility gates, the existing popup root and a new recovered React tag. Fabric can recycle physical View objects, so Java object identity is not an anchor-generation oracle. The automation service's [include-not-important flag](https://developer.android.com/reference/android/accessibilityservice/AccessibilityServiceInfo#FLAG_INCLUDE_NOT_IMPORTANT_VIEWS) deliberately reveals excluded nodes for geometry inspection. Its ordinary accessibility-exclusion check temporarily removes that override, validates a visible positive control first, refreshes parent/child data during bounded stable-mode traversal, treats incomplete absence queries as inconclusive, and restores only its own query flags in `finally`; it does not change enabled accessibility services or certify TalkBack workflows. Required scenario milestones and screenshot names must all be present and unique before the host runner accepts success. An incomplete, failed, aborted or contradictory instrumentation result cannot pass merely because `adb` exits with zero.

Android framework `getGlobalVisibleRect` is not a rendered-clip oracle for React Native: its scroll/view groups can clip their canvas while leaving framework `clipChildren` disabled. The inline clipping check independently locates the title above the scroll viewport and verifies that RN's native touch-target traversal excludes that clipped content. Review the retained screenshots for drawing behavior; this is not an automated pixel comparison.

The default output directory is a new timestamped folder under `.cache/native-popper-android`. Pass `--output PATH` to choose an empty directory; existing evidence is preserved. The output directory retains native JSON, the instrumentation transcript and screenshots. Failed reports retain their available screenshots; command failures also retain stdout/stderr. The native test leaves its artifacts in the catalog's own cache. Review those images alongside the assertions and record device/OS, source revision and remaining gaps in the validation evidence.

`node --test scripts/native-catalog/*.test.mjs` checks command targeting, generated-source ownership, result validation, cancellation, diagnostic collection and restoration policy without operating a device. Those host tests and a compiled APK do not establish native interaction success. A debug build or emulator result does not certify release performance, screen-reader behavior, keyboard/IME handling, every clipping case or full component compatibility. See [performance](performance.md), [validation](validation.md) and [Popper](popper.md).

## iOS catalog checks

The reusable [XCTest source](../tests/native/ios/PopperCatalogUITests.swift) runs against the same development catalog. It uses Apple's [coordinate drag API](<https://developer.apple.com/documentation/xcuiautomation/xcuicoordinate/press(forduration:thendragto:withvelocity:thenholdforduration:)>) with a hold before release, checks actual anchor movement and recovery, validates native checked states and inline/window accessibility ancestry, and repeats transform/reset and reopen/close interactions. A separate test checks shared-anchor retargeting, removal and recovery while preserving the popup child's read count; native controls and accessibility visibility must actually change. Clipped inline titles must be unhittable; retained screenshots need visual review. XCTest accessibility frames do not prove the complete physical View hierarchy or rendered pixel clip.

Use the generated catalog iOS project from the [development-build setup](installation.md). In Xcode, add a UI Testing Bundle named `PopperCatalogUITests`, select `MUINativeCatalog` as its target application and include the source above in that target. Remove the generated empty test class, use a test deployment target compatible with the installed XCTest frameworks and share a scheme containing this UI test target. The source must be a project-relative reference or copied file, not another contributor's temporary path. This one-time test-target setup does not change the library's runtime dependencies.

List booted simulators and select an existing device before running. Keep the catalog Metro server available on port 8081:

```sh
xcrun simctl list devices booted
export MUI_QA_IOS=YOUR_EXISTING_SIMULATOR_UDID
xcodebuild test \
  -workspace apps/native-catalog/ios/MUINativeCatalog.xcworkspace \
  -scheme PopperCatalogUITests \
  -destination "id=$MUI_QA_IOS" \
  -parallel-testing-enabled NO \
  -collect-test-diagnostics never \
  -derivedDataPath .cache/popper-ios-tests \
  -resultBundlePath .cache/popper-ios-results-NEW.xcresult
```

Use a new result-bundle path for each run. `xcodebuild test` builds and installs the catalog and test runner on the selected simulator; it does not require opening another simulator window. After success or failure, reopen the catalog without closing the simulator or restarting Metro:

```sh
xcrun simctl launch "$MUI_QA_IOS" dev.altroo.muinative.catalog
```

Retain the `.xcresult` bundle and export screenshots with `xcrun xcresulttool export attachments --path RESULT.xcresult --output-path EMPTY_DIRECTORY`. Record source revision, selected device/OS, build mode, scenario results and known limitations alongside the Android evidence. Passing simulator checks does not certify physical-device, screen-reader, keyboard/IME, RTL/font-scaling or calibrated release-performance gates.

## Editable keyboard commands

The catalog's Keyboard scene isolates the reusable native transport from Autocomplete. It contains an input with an outer command owner, optional inner owner, window Portal and native Dialog, plus an input outside that boundary. Its receipt panel reports actual native target identity and callback phases. Enter removes the outer declaration during key-down, making release/focus races observable.

Android uses the same test APK and runner as Popper, with an explicit scenario. Prepare the generated project, build/install both APKs as above, and select the existing device:

```sh
node scripts/native-catalog/android-keyboard.mjs prepare apps/native-catalog/android
adb -s "$MUI_QA_DEVICE" shell am instrument -w -e scenario keyboard \
  dev.altroo.muinative.catalog.test/dev.altroo.muinative.catalog.test.PopperInstrumentation \
  > keyboard-native.txt
node scripts/native-catalog/android-keyboard.mjs summarize keyboard-native.txt
```

This direct instrumentation command starts the catalog but does not perform the Popper host runner's restoration. Afterward, reopen only that catalog activity, preserving the emulator and Metro:

```sh
adb -s "$MUI_QA_DEVICE" shell am start -n dev.altroo.muinative.catalog/.MainActivity
```

The strict summary requires all 22 milestones and four screenshot names; `adb` exit zero alone is insufficient. The native run retains the JSON report and images in its reported application-cache directory. It checks navigation, ordinary editing, complete held-key ownership, release after focus moves outside, canceled release, a programmatically installed native composing span, closest-owner routing, Portal and actual React Native Dialog-window behavior. Window callback identity must be installed while held and restored after release. An unrelated edit while a key is held must still work. The outside editor's native key listener detects a leaked Enter-up. Dialog Escape must preserve React Native's native request-close route. These injected `Instrumentation.sendKeySync` checks do not represent a physical keyboard or a real composing IME.

The host's `verifyDescendantKeyPolicy` Gradle task runs 26 device-free assertions against the same sequence policy used by the native adapter. It supplements installed interactions; it does not replace them.

For iOS, include [KeyboardCatalogUITests.swift](../tests/native/ios/KeyboardCatalogUITests.swift) in the existing UI test target described above. The inline, nested/Portal and Dialog tests use public XCTest key synthesis. Text deletion uses XCTest's text API because its single-key Delete command does not edit the plain React Native positive control on the recorded iOS 27.0 runtime. The extended navigation and Dialog Enter tests first require Delete/Return to work in that plain control. A failed driver prerequisite produces an explicit XCTest skip with an attachment, never a passing compatibility result. If the prerequisite succeeds, all extended assertions are mandatory. Inspect passed, failed and skipped counts separately in the result bundle; physical keyboards and real IMEs remain required gates.

Original Material UI 9.5.0 navigation expectations are recorded separately in the [browser fixture](../tests/fixtures/mui-autocomplete-keyboard-browser-9.5.0.json). Build its integrity-checked probe with `node scripts/reference/autocomplete-keyboard.mjs --check` and serve the generated `.cache/autocomplete-keyboard-reference` directory on loopback. `window.verifyReference()` checks 26 original-browser observations, including default prevention, selection/highlight, disabled options and the upstream IME-229 guard. That reference does not certify native transport or full Autocomplete.

## Autocomplete integration

The Autocomplete scene exercises native search, mapped selections, removable multiple-value Chips, grouping, free-solo software submission, disabled/read-only/loading states and ordinary/full-screen native Dialogs. Its Keyboard edge mode intentionally places an editor low enough to test suggestions above the docked keyboard. Mode changes require the new scene identifier before another action, preventing retained controls from the previous scene being used. The iOS full-screen example applies safe-area insets inside its modal, since the outer screen's SafeAreaView does not inset a separate modal layout. These checks use a development build containing the native host; Expo Go is insufficient.

Android reuses the explicitly selected device, generated project and test runner above:

```sh
node scripts/native-catalog/android-autocomplete.mjs prepare apps/native-catalog/android
# Rebuild and install the catalog and test APK as described above.
adb -s "$MUI_QA_DEVICE" shell am instrument -w -r -e scenario autocomplete \
  dev.altroo.muinative.catalog.test/dev.altroo.muinative.catalog.test.PopperInstrumentation \
  > autocomplete-native.txt
node scripts/native-catalog/android-autocomplete.mjs summarize autocomplete-native.txt
```

The summary requires the complete ordered 17-stage scenario, five named screenshots, valid native touch coordinates and a successful native report. The free-solo stage repeats eight synthetic typing/submission bursts and retains native edit-range/selection traces. Selected Chips must be fully visible. Screenshots wait for a fresh hardware frame from the current editor window to be submitted; this is a capture boundary, not a measurement of physical presentation latency. Preserve failed transcripts and screenshots too. The report's `artifactDirectory` identifies the catalog-owned cache folder; copy each reported image with `adb -s "$MUI_QA_DEVICE" exec-out run-as dev.altroo.muinative.catalog cat ARTIFACT_DIRECTORY/IMAGE.png`. Reopen the catalog after instrumentation. If a command is interrupted, first stop only its target package and confirm instrumentation has ended before restoring interactive controls.

Add [AutocompleteCatalogUITests.swift](../tests/native/ios/AutocompleteCatalogUITests.swift) to the existing shared iOS UI test target alongside the Popper and keyboard sources. Use the iOS command above with `-only-testing:PopperCatalogUITests/AutocompleteCatalogUITests` to run its nine cases. Keep a new result bundle for every run and export its attachments for visual review. The software-submission case requires the simulator's software keyboard. Do not substitute a programmatic selection callback for the native Done key.

Native checks verify scoped interactions and geometry. They do not certify physical keyboards, tag navigation/deletion from the editor, composing IMEs, screen readers, large virtualized lists or calibrated release performance. See [Autocomplete](autocomplete.md) for the public contracts and remaining gates.
