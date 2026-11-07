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

## Svg icons and factories

Use the same installed development catalog, generated Android test project and explicit device selection described above. Prepare once more to copy [SvgIconScenario.java](../tests/native/android/SvgIconScenario.java) with its ownership guard, then rebuild/install the test APK. Do not start another device or restart Metro for this scenario.

```sh
node scripts/native-catalog/android-popper.mjs prepare --project /path/to/generated/android
# Rebuild/install the test APK using the commands above.
node scripts/native-catalog/android-popper.mjs run \
  --serial emulator-5554 --scenario svg-icon \
  --output .cache/native-svg-icon/android-run-1
```

The collector requires an empty output directory and preserves raw instrumentation, validated JSON and native screenshots. It rejects ambiguous/failed/partial reports, unsafe artifact paths, absent geometry, wrong rendered colors and unchanged font-ink bounds. Failure cleanup stops only the target catalog package, confirms instrumentation ended and restores the catalog. Interruption handling uses the same bounded shared runner as Popper and Accordion.

The scenario checks small/medium/large dimensions, symbolic currentColor inside a group, palette changes in real rendered pixels, one original onClick touch, actual 48 dp SVG ref measurement/PNG export and larger text ink inside equal viewports. Native Canvas raster bounds supplement screenshots; these debug checks do not measure release performance.

Add [SvgIconCatalogUITests.swift](../tests/native/ios/SvgIconCatalogUITests.swift) to the existing shared iOS UI test target. Run the iOS workspace/device command above with `-only-testing:PopperCatalogUITests/SvgIconCatalogUITests`. Its case checks SVG accessibility names, real frames, touch/palette receipts and PNG export, then retains the two font samples for visual review. Export attachments from a fresh result bundle. iOS glyphs are visually reviewed here; the Android font-raster assertion is separate. Physical screen-reader/keyboard/font/RTL matrices, browser fill animations and calibrated performance remain open.

## Reading direction and system text size

The optional **Reading and direction** controls in Groups exercise horizontal/vertical layouts, live local direction, independent default/fixed/capped text roots, live scaling-policy changes, retained action counts, mixed wrapping and Typography-origin window Portal text. Native measurement JSON is hidden until **Show native measurements** is selected.

Build/install the maintained Android app and instrumentation after running `android-popper.mjs prepare`. The reading scenario uses the existing runner. Select the current emulator explicitly and use new output directories for every attempt:

```sh
PATH="$ANDROID_HOME/platform-tools:$PATH" node scripts/native-catalog/text-profile.mjs \
  --platform android --device "$ANDROID_SERIAL" --size 2.0 \
  --outputDir /tmp/mui-native-reading-android-profile \
  -- node scripts/native-catalog/android-popper.mjs run \
  --scenario button-group-reading --serial "$ANDROID_SERIAL" \
  --adb "$ANDROID_HOME/platform-tools/adb" \
  --output .cache/native-reading-android
```

Run once without `--global-rtl` and once with that runner flag, at normal and enlarged text sizes. Global RTL is a process-local test override, not a persistent locale change. The version-three collector requires seven ordered states, eight screenshots, actual native text/line bounds, SP-converted fonts, retained action counters, real Portal text and actual border-layer corner raster samples, alongside resolved radius diagnostics. Missing raster evidence, older geometry-only reports or a fresh radius calculation hiding a stale native drawing path cannot pass. Android SP conversion can be nonlinear; the collector uses platform conversion rather than multiplying by `scaledDensity`.

For iOS, add [ButtonGroupReadingUITests.swift](../tests/native/ios/ButtonGroupReadingUITests.swift) to the shared UI-test target and build it. Run both methods with `-only-testing:PopperCatalogUITests/ButtonGroupReadingUITests`. Wrap the existing `xcodebuild test-without-building` command with `text-profile.mjs --platform ios --device UUID --size accessibility-medium --outputDir /tmp/NEW_PROFILE_DIRECTORY --`. Use a concrete simulator UUID and a fresh result bundle. The tests require the actual requested global direction, native accessibility frames, real `onTextLayout` glyph metrics against UIKit, live scaling policies and independent Portal text. Global direction uses process-local launch arguments. Export and review result-bundle screenshots separately.

The profile helper records the original OS text setting before applying and verifying the requested size, waits for its owned test process group, then restores and verifies the original setting. Its durable receipt and per-device lease stay outside the checkout. It refuses a second run against an existing lease; an unconfirmed child exit, restoration failure or external setting change retains recovery evidence. Supplied collectors remain responsible for ending remote/on-device work before returning. If a device disconnects, preserve the failed receipt, confirm test termination and the original setting after recovery, and resolve that recovery evidence before starting another profile. Do not count an interrupted run as a compatibility result.

These finite emulator/simulator checks do not certify every text category, screen-reader usability, physical-device behavior or release performance.

### Divider finite iOS scene

Add [DividerCatalogUITests.swift](../tests/native/ios/DividerCatalogUITests.swift) to the existing shared UI-test target, then build that target before the runs. The source uses Swift 6 main-actor isolation and asynchronous XCTest setup/teardown; preserve those lifecycle signatures in the test target. The collector follows **Wrappers > Divider** and visits all twelve states under each selected profile. It requires fresh explicit ref measurements, retained child count/ref lifecycle, real counter/custom-root touches, public native accessibility frames and composited-PNG samples for light/dark strokes, counter contrast and native `borderStyle` reset/restoration.

Run its two methods separately with the existing iOS workspace/device command. Use `text-profile.mjs` with a concrete existing simulator UUID, a fresh external `--outputDir` and a fresh result bundle for each run:

- Normal: `--size large` and `-only-testing:PopperCatalogUITests/DividerCatalogUITests/testAllTwelveStagesAtNormalDynamicType`.
- Enlarged: `--size accessibility-extra-extra-extra-large` and `-only-testing:PopperCatalogUITests/DividerCatalogUITests/testAllTwelveStagesAtEnlargedDynamicType`.

The tests fail a wrong profile: normal requires native fontScale near 1, and the largest accessibility run requires the pinned RN 0.88.1 multiplier 3.571 within serialization tolerance. Do not run both methods under one unchanged profile or substitute an authored font-size change. The existing profile wrapper records and restores the actual OS setting; these Swift tests change no OS setting.

Retain each twelve-stage JSON attachment and review the PNG attachments separately. Scrolling changes screen origins, so ref association compares fresh measured dimensions with the independently revealed native root; root/parent geometry uses their current accessibility frames. XCUI exposes no React Native View tag or UIView pointer, so identity evidence is the retained child plus forwarded-ref lifecycle. The PNG samples use public composited element screenshots; they do not reuse Android's text-excluded retained-view raster or establish full physical ancestry, every pixel or screen-reader behavior. See the [recorded validation](validation.md#2026-11-07-finite-native-divider-contracts) for scoped execution evidence. Adding or compiling this collector alone is not an execution or visual-pass claim.

### Paper finite native scene

The **Wrappers > Paper** scene keeps a stock View root and a custom native root mounted across 33 states: default, outlined, square, light zero elevation, every dark elevation from zero through 24, dark square, RTL, an explicit native-style reset and restoration. The two press counters must remain one after their initial real touches. The raw event receipt retains the first captured native touch; later scroll/cancel touch-end events may still bubble normally and must not replace that receipt.

Run `node scripts/native-catalog/android-popper.mjs prepare --project apps/native-catalog/android`, then build/install the maintained instrumentation in the existing development project. Keep the catalog connected to Metro and foreground it before testing. The [Paper collector](../tests/native/android/PaperScenario.java) requires Android 29 or later for frame-commit capture and checks the active catalog accessibility window and native focus before injecting each touch event. These ownership checks are snapshots, not an atomic guarantee across OS window changes. A blocking system window fails the check; it is not permission to inject events into another app.

With an explicit existing emulator serial and fresh output directories, run normal text as follows:

```sh
PATH="$ANDROID_HOME/platform-tools:$PATH" node scripts/native-catalog/text-profile.mjs \
  --platform android --device "$ANDROID_SERIAL" --size 1.0 \
  --outputDir "$HOME/.cache/mui-native-paper-normal-profile-1" \
  -- node scripts/native-catalog/android-popper.mjs run \
  --scenario paper --font-profile normal --serial "$ANDROID_SERIAL" \
  --adb "$ANDROID_HOME/platform-tools/adb" --output .cache/native-paper-normal
```

Repeat with `--size 2.0`, `--font-profile enlarged` and new profile/evidence output directories. Profile directories must stay outside the checkout; only the inner Android evidence directory may use `.cache`. The profile helper must find the SDK's `adb`, so retain the PATH prefix for both runs. It records and restores the original OS text setting. The native collector checks SP-converted font paint, retained native root/text/control instances, fresh ref measurements, intrinsic height and padding, border/radius properties, real event fields and all 25 source-backed dark overlays. Its five text-excluded raster samples per root come from `View.draw`; they are separate from the named full-window screenshots and do not certify GPU shadow equivalence.

For iOS, add [PaperCatalogUITests.swift](../tests/native/ios/PaperCatalogUITests.swift) to the existing shared UI-test target and build it. Preserve its Swift 6 main-actor class and asynchronous XCTest lifecycle. Run the methods separately through the existing `text-profile.mjs` wrapper and workspace/device command, with a concrete existing simulator UUID and fresh profile/result directories:

- Normal: `--size large` and `-only-testing:PopperCatalogUITests/PaperCatalogUITests/testAllThirtyThreeStagesAtNormalDynamicType`.
- Enlarged: `--size accessibility-extra-extra-extra-large` and `-only-testing:PopperCatalogUITests/PaperCatalogUITests/testAllThirtyThreeStagesAtEnlargedDynamicType`.

The Swift tests require fontScale one and the pinned RN 0.88.1 largest-category multiplier 3.571 respectively. They verify current accessibility geometry, intrinsic scaled content, raw event retention, 33 fresh ref requests, composited surface colors, square/rounded cutouts, the outlined edge and scaled counter glyphs. The outline raster-width bound is specific to the tested 3x pixel scale. XCUI identity evidence is the forwarded-ref lifecycle and retained child; no native UIView pointer or React tag is exposed.

Export all authored JSON and PNG attachments and inspect failed runs too. Keep passed, failed and skipped XCTest counts separate. The collectors provide finite native evidence; adding or compiling them alone establishes no execution result. General radius reconstruction, calibrated GPU shadows, every density/platform version, physical accessibility and optimized-build performance remain separate gates. See the [Paper contract](paper.md) for supported source behavior and native adaptations.

### Box finite native scene

The **Wrappers > Box** scene retains three roots: the default native View, a custom ref-forwarding native component and styled(Box). Each has a real press counter and independently measured inherited Copy text. Eleven states exercise ignored MuiBox configuration, sx-array priority, final native styles, the div alias, physical RTL spacing, inherited text, ancestor styling, an explicit native theme, reset and restoration. The receipt contains authored flags and fresh ref measurements; it does not report computed colors as native observations.

For Android, prepare and build the existing instrumentation as described above. Run the same text-profile wrapper with `--scenario box --font-profile normal` at `--size 1.0`; repeat with `--font-profile enlarged` at `--size 2.0`. Use an explicit existing emulator serial and fresh evidence/profile directories. The [collector](../tests/native/android/BoxScenario.java) retains actual root, counter and text object identities, reads native geometry and TextPaint, and records RN's native SP conversions rather than assuming linear font scaling. The report validator requires all eleven stages and three counters, current measurements, intrinsic height, minimum touch targets, native text attributes and expected physical spacing.

Android paint evidence comes from finite text-excluded top strips and raw border columns drawn by the retained View. Native self/ancestor alpha and visibility are recorded separately because View.draw does not apply parent compositing. The reset edge must lose its painted border as well as its layout inset. A positive top band permits one color-consistent antialiased transition row and measures its coverage within the existing physical-pixel bound; arbitrary colors, detached bands and stale zero-width borders fail. Full-window PNGs and raw retained-view samples are distinct observations; neither establishes every-pixel or calibrated GPU equivalence.

For iOS, add [BoxCatalogUITests.swift](../tests/native/ios/BoxCatalogUITests.swift) to the existing shared UI-test target and build it. Preserve the Swift main-actor class and asynchronous XCTest setup. Run each method through the existing text-profile wrapper and workspace/device command:

- Normal: `--size large` and `-only-testing:PopperCatalogUITests/BoxCatalogUITests/testAllElevenStagesAtNormalDynamicType`.
- Enlarged: `--size accessibility-extra-extra-extra-large` and `-only-testing:PopperCatalogUITests/BoxCatalogUITests/testAllElevenStagesAtEnlargedDynamicType`.

The iOS collector compares current native accessibility frames, intrinsic geometry, composited surface/edge samples and Copy glyphs against an independent UIKit raster. Its blank-canvas control rejects raster rounding fringes, and its font-size control must distinguish an unchanged previous font even when line height has updated. Font tolerances use native pixels rather than growing with OS text scale. XCUI identity evidence is the retained forwarded-ref lifecycle and children; it does not expose a UIView pointer. These finite checks do not certify arbitrary font shaping or letter spacing, physical screen-reader usability, wider platform matrices or optimized performance. Retain and inspect all JSON/PNG attachments, including failed runs. See the [Box contract](box.md) for source behavior and native adaptations.
