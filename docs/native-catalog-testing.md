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
  -derivedDataPath .cache/popper-ios-tests \
  -resultBundlePath .cache/popper-ios-results-NEW.xcresult
```

Use a new result-bundle path for each run. `xcodebuild test` builds and installs the catalog and test runner on the selected simulator; it does not require opening another simulator window. After success or failure, reopen the catalog without closing the simulator or restarting Metro:

```sh
xcrun simctl launch "$MUI_QA_IOS" dev.altroo.muinative.catalog
```

Retain the `.xcresult` bundle and export screenshots with `xcrun xcresulttool export attachments --path RESULT.xcresult --output-path EMPTY_DIRECTORY`. Record source revision, selected device/OS, build mode, scenario results and known limitations alongside the Android evidence. Passing simulator checks does not certify physical-device, screen-reader, keyboard/IME, RTL/font-scaling or calibrated release-performance gates.
