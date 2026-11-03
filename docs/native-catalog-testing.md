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

The scenario checks window and inline popup ancestry, actual horizontal/vertical anchor attachment, native child-button feedback, switch checked-state updates, uniform scale/rotation and reset matrices, popup transform inheritance, explicit boundary containment using unclipped native rectangles, repeated transform resets and closing. Required scenario milestones and screenshot names must all be present and unique before the host runner accepts success. An incomplete, failed, aborted or contradictory instrumentation result cannot pass merely because `adb` exits with zero.

The default output directory is a new timestamped folder under `.cache/native-popper-android`. Pass `--output PATH` to choose an empty directory; existing evidence is preserved. The output directory retains native JSON, the instrumentation transcript and screenshots. Failed reports retain their available screenshots; command failures also retain stdout/stderr. The native test leaves its artifacts in the catalog's own cache. Review those images alongside the assertions and record device/OS, source revision and remaining gaps in the validation evidence.

`node --test scripts/native-catalog/*.test.mjs` checks command targeting, generated-source ownership, result validation, cancellation, diagnostic collection and restoration policy without operating a device. Those host tests and a compiled APK do not establish native interaction success. A debug build or emulator result does not certify release performance, screen-reader behavior, keyboard/IME handling, every clipping case or full component compatibility. See [performance](performance.md), [validation](validation.md) and [Popper](popper.md).
