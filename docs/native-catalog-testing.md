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

### Independent iOS Escape driver control

Add [NativeKeyboardDriverControl.swift](../tests/native/ios/NativeKeyboardDriverControl.swift) to the catalog **application** target. It provides a debug-only UIKit scene with no React/MUI view tree. The UI test target still includes the separate XCTest files. In the generated SDK58 `SceneDelegate.swift`, import UIKit and route the control before Expo's normal scene setup:

```swift
import UIKit
internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  override func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions) {
    if let control = NativeKeyboardDriverControl.window(for: scene) {
      window = control
      (UIApplication.shared.delegate as? AppDelegate)?.window = control
      control.makeKeyAndVisible()
      return
    }
    super.scene(scene, willConnectTo: session, options: connectionOptions)
  }
}
```

Preserve existing application scene customizations when adding that conditional. The control is selected only by an explicit test launch argument in Debug builds. Normal catalog launches and Release builds use the ordinary scene. It adds no library dependency and is not part of the npm packages.

The two Autocomplete Escape cases first require ArrowDown and Escape to reach this same native control exactly once. Missing setup, invalid receipts, an unavailable ArrowDown, raw Escape without its command callback, or duplicate Escape delivery fail. Only a valid ArrowDown receipt with neither an Escape command nor a raw Escape press produces an explicit skip with native values and a screenshot; the React catalog is restored afterward. Once the driver passes, the full Dialog assertions are mandatory. A skip is an unverified interaction, never passing compatibility evidence. Keep the underlying physical-keyboard gate open in [issue #55](https://github.com/Altroo/mui-native/issues/55).

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

The strict summary requires all 22 milestones and four screenshot names; `adb` exit zero alone is insufficient. The native run retains the JSON report and images in its reported application-cache directory. It checks navigation, ordinary editing, complete held-key ownership, release after focus moves outside, canceled release, a programmatically installed native composing span, closest-owner routing, Portal and actual React Native Dialog-window behavior. Window callback identity must be installed while held and restored after release. An unrelated edit while a key is held must still work. The outside editor's native key listener detects a leaked Enter-up. An unhandled descendant Escape must close the Dialog once after its paired release; independent native request-close remains available. These injected `Instrumentation.sendKeySync` checks do not represent a physical keyboard or a real composing IME.

The host's `verifyDescendantKeyPolicy` Gradle task runs 37 device-free assertions against the same sequence policy used by the native adapter. It supplements installed interactions; it does not replace them.

For iOS, include [KeyboardCatalogUITests.swift](../tests/native/ios/KeyboardCatalogUITests.swift) in the existing UI test target described above. The inline, nested/Portal and Dialog tests use public XCTest key synthesis. Text deletion uses XCTest's text API because its single-key Delete command does not edit the plain React Native positive control on the recorded iOS 27.0 runtime. The extended navigation and Dialog Enter tests first require Delete/Return to work in that plain control. A failed driver prerequisite produces an explicit XCTest skip with an attachment, never a passing compatibility result. If the prerequisite succeeds, all extended assertions are mandatory. Inspect passed, failed and skipped counts separately in the result bundle; physical keyboards and real IMEs remain required gates.

Original Material UI 9.5.0 navigation expectations are recorded separately in the [browser fixture](../tests/fixtures/mui-autocomplete-keyboard-browser-9.5.0.json). Build its integrity-checked probe with `node scripts/reference/autocomplete-keyboard.mjs --check` and serve the generated `.cache/autocomplete-keyboard-reference` directory on loopback. `window.verifyReference()` checks 26 original-browser observations, including default prevention, selection/highlight, disabled options and the upstream IME-229 guard. That reference does not certify native transport or full Autocomplete.

## Autocomplete integration

The Autocomplete scene exercises native search, mapped selections, removable multiple-value Chips, grouping, free-solo software submission, disabled/read-only/loading states and ordinary/full-screen native Dialogs. Its Keyboard edge mode intentionally places an editor low enough to test suggestions above the docked keyboard. Mode changes require the new scene identifier before another action, preventing retained controls from the previous scene being used. The iOS full-screen example applies safe-area insets inside its modal, since the outer screen's SafeAreaView does not inset a separate modal layout. These checks use a development build containing the native host; Expo Go is insufficient. Rebuild after adding the managed editor. Android rejects stale generated autolinking metadata that omits its Fabric descriptor; remove only the generated cache identified by that error, then rebuild.

Android reuses the explicitly selected device, generated project and test runner above:

```sh
node scripts/native-catalog/android-autocomplete.mjs prepare apps/native-catalog/android
# Rebuild and install the catalog and test APK as described above.
adb -s "$MUI_QA_DEVICE" shell am instrument -w -r -e scenario autocomplete \
  dev.altroo.muinative.catalog.test/dev.altroo.muinative.catalog.test.PopperInstrumentation \
  > autocomplete-native.txt
node scripts/native-catalog/android-autocomplete.mjs summarize autocomplete-native.txt
```

The summary requires the complete ordered 31-stage scenario, nine named screenshots, valid native touch coordinates and a successful native report. Ordinary and full-screen Dialog checks require child Escape to close suggestions while retaining native editor focus, the same window token and the original callback, followed by an unhandled Escape that closes the parent. The tag controls require actual selected-host focus, first-item clamping, return to the editor, native middle-caret movement and selected-range collapse. Android establishes the range directly through EditText selection; iOS uses a native word-selection gesture and requires exact selection callbacks before and after collapse. A held Left-down must move native focus before release; a native event-dispatch listener requires no key-up to either the old editor or the new Chip, and the original Window callback must be restored. Held Chip Delete must retain both values until matching key-up, then remove exactly one. Empty-editor Backspace removes the final selected value, including the final-tag boundary; an extra Backspace must find no declaration, no additional value callback and no retained window lease. The final software-request stage exercises surrounding-text and code-point deletion, three `sendKeyEvent` flag variants, nested batches, empty commit/composition cleanup, retired and queued-retired connections, and a covered native window. Requested stock key callbacks and underlying return values remain observable. Retired connections must still edit an ordinary draft without deleting a selected tag. Controlled parent commits may occur between native receipts, so the batch check preserves both requests and the parent’s current value authority. Catalog focus receipts compose the input/Chip handlers and record delivered native events; they do not request focus. The free-solo stage repeats eight synthetic typing/submission bursts and retains native edit-range/selection traces. Selected Chips must be fully visible. Screenshots wait for a fresh hardware frame from the current editor window to be submitted; this is a capture boundary, not a measurement of physical presentation latency. Preserve failed transcripts and screenshots too. The report's `artifactDirectory` identifies the catalog-owned cache folder; copy each reported image with `adb -s "$MUI_QA_DEVICE" exec-out run-as dev.altroo.muinative.catalog cat ARTIFACT_DIRECTORY/IMAGE.png`. Reopen the catalog after instrumentation. If a command is interrupted, first stop only its target package and confirm instrumentation has ended before restoring interactive controls.

Add [AutocompleteCatalogUITests.swift](../tests/native/ios/AutocompleteCatalogUITests.swift) to the existing shared iOS UI test target alongside the Popper and keyboard sources. Use the iOS command above with `-only-testing:PopperCatalogUITests/AutocompleteCatalogUITests` to run its fourteen cases. Escape and hardware Backspace cases first use the independent UIKit command control, requiring ArrowDown delivery before inspecting the requested command and raw HID receipts. Missing command and raw input explicitly skip the affected case; raw input without its registered command fails. Text API deletion does not establish hardware delivery. Keep a new result bundle for every run and export its attachments for visual review. The software-submission and software-Backspace cases require the simulator's software keyboard. The Backspace case touches the visible system Delete key twice: deleting the final draft character must retain both tags, then deleting from the empty editor must remove exactly the last tag and retain editor focus. It retains the keyboard hierarchy and before/after observations. Do not substitute text-API deletion or a programmatic selection callback for the visible system keys.

Native checks verify scoped interactions and geometry. They do not certify physical keyboards, complete tag-navigation variants, iOS hardware Backspace, untested software keyboards and layouts, composing IMEs, screen readers, large virtualized lists or calibrated release performance. See [Autocomplete](autocomplete.md) for the public contracts and remaining gates.

## Matched cold-editor input comparison

The catalog's **Inputs** scene compares a controlled stock React Native `TextInput`, controlled Material `TextField`, controlled `Autocomplete` and uncontrolled `Autocomplete`. Each mode button remounts its editor. All use the same capitalization/correction policy. The three controlled modes also expose authored replacement and clear controls; those update the value prop without fabricating an input callback receipt.

Prepare and build the existing Android catalog/test project as above, using `node scripts/native-catalog/android-input-integrity.mjs prepare PROJECT` when its generated project is elsewhere. Run the fixed eight-round matrix on one explicitly selected device:

```sh
adb -s DEVICE_SERIAL shell am instrument -w -r -e scenario input-integrity \
  dev.altroo.muinative.catalog.test/dev.altroo.muinative.catalog.test.PopperInstrumentation > instrumentation.txt
node scripts/native-catalog/android-input-integrity.mjs artifact instrumentation.txt
```

The artifact command validates and prints one relative app-cache directory, including for a failed comparison. Retrieve that directory's `report.json` using `adb -s DEVICE_SERIAL exec-out run-as dev.altroo.muinative.catalog cat VALIDATED_DIRECTORY/report.json > report.json`, then validate both files together:

```sh
node scripts/native-catalog/android-input-integrity.mjs summarize instrumentation.txt report.json
```

The validator requires all 32 ordered cold scenes, distinct React tags, native/window focus, complete native text and matching React receipts, bounded traces, touch evidence and authored replacement/clear positive controls. A successful adb process or passing subset is insufficient. Preserve failures and their raw reports. Wait for instrumentation to finish before reopening the catalog; if interrupted, stop only the catalog package and confirm its processes have ended before restoring it. These manual commands do not manage devices or Metro.

React Native suppresses JS-origin `TextWatcher` callbacks. This scenario therefore also installs a final `InputFilter` that returns `null`, preserving text and prior filters. It records replacement proposals separately, proves visibility with authored replace/clear controls and removes only its observer in `finally`. Filters observe proposals, while the native text checks establish their resulting values; neither trace alone certifies every transient value. Truncated or missing observations cannot pass. This synthetic-key comparison does not establish physical-keyboard or IME correctness, and passing runs do not explain the intermittent omission in [issue #58](https://github.com/Altroo/mui-native/issues/58).

`tests/native/ios/InputCatalogUITests.swift` provides a separate touch/software-keyboard smoke test for all four controls and fresh remounts. Include it in the existing XCTest UI-test target alongside the other catalog sources. Android key injection and iOS `typeText` are distinct evidence.

## Collapse layout transitions

The **Transitions** scene exercises one retained native subtree in vertical and horizontal modes, an editable note count, automatic timing and reduced motion. **Slow preview** deliberately uses a five-second numeric timeout so native automation can prove an active intermediate size before reversing it. It leaves the automatic-timing example available and does not change the library default.

Prepare the existing Android project, rebuild/install its test APK, then run on one explicitly selected device:

```sh
node scripts/native-catalog/android-collapse.mjs prepare apps/native-catalog/android
adb -s "$MUI_QA_DEVICE" shell am instrument -w -e scenario collapse \
  dev.altroo.muinative.catalog.test/dev.altroo.muinative.catalog.test.PopperInstrumentation \
  > collapse-native.txt
node scripts/native-catalog/android-collapse.mjs summarize collapse-native.txt
```

The summary requires all 13 ordered milestones, four named screenshots and seven native dimension samples. Closed/intermediate roots must clip; entered roots must restore visible overflow and natural dimensions. Both horizontal endpoints require their lifecycle receipts. The active exit is sampled before a separate native reversing touch, and the retired exit must not increment its completion count. Content must grow while expanded and retain its edit through closing. A zero `adb` exit code alone cannot pass. Retrieve the report's validated app-cache screenshots as described above, retain failures and reopen the catalog after instrumentation.

Add [CollapseCatalogUITests.swift](../tests/native/ios/CollapseCatalogUITests.swift) to the shared iOS UI test target. Run `-only-testing:PopperCatalogUITests/CollapseCatalogUITests` with the existing workspace/device command above. Its two cases check actual native frames, retained growth, hidden accessibility descendants, active interruption, horizontal lifecycle receipts and reduced motion. Keep a fresh result bundle and review the exported attachments. These development-build/emulator checks do not establish physical-device, screen-reader, complete font/RTL or calibrated release-performance compatibility.
