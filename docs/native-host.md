# Native interaction host

`@altroo/mui-native-host` is an independent native dependency of the material package. It provides `InteractiveView` and `NativePressable` for native keyboard/focus composition, plus the separate [NativePicker anchor](native-picker.md) for platform selection surfaces. Its Fabric spec, Android manager/view and iOS component view ship in the local archive and are autolinked into the application. The interaction primitive adds no containing native View or global React Native feature-flag override. Picker presentation uses its own transparent native anchor.

The current peer matrix is React 19.3.0 / React Native 0.88.1, with the catalog on Expo SDK 58. The host archive is `0.0.1-dev.0`; other library archives remain `0.0.0-dev.0`. The host version also satisfies CocoaPods' default minimum-version constraint, unlike a `0.0.0` prerelease. Nothing is published to npm.

## Consumer setup

Install material, system and host archives together using the [installation guide](installation.md). Keep the host as a direct dependency of the native application so both Expo and React Native autolinking discover it. Rebuild after adding or changing native source. Expo Go does not include this component.

For Expo, use `npx expo run:ios` or `npx expo run:android` with local native prerequisites. For an existing bare React Native iOS application, run its usual CocoaPods installation and native build; Android uses its usual Gradle build. The host declares native platform dependencies through `react-native.config.js`, its podspec and Gradle configuration. Web applications continue to resolve original MUI and do not import this host.

## Custom native roots

```tsx
import React from 'react';
import { type ViewInstance } from 'react-native';
import { NativePressable, InteractiveView } from '@altroo/mui-native-host';
import ButtonBase, { type ButtonBaseRootProps } from '@mui/material/ButtonBase';

const Root = React.forwardRef<ViewInstance, ButtonBaseRootProps>((props, ref) => (
  <NativePressable {...props} ref={ref} />
));
<ButtonBase component={Root}>Action</ButtonBase>;

<InteractiveView
  focusable
  tabIndex={-1}
  managedKeys={['ArrowDown', 'ArrowUp', 'Home', 'End']}
  onKeyDown={(event) => {
    /* nativeEvent.key */
  }}
/>;
```

`focusable` controls native focus eligibility. `tabIndex={-1}` excludes the host itself from traversal while allowing explicit focus and eligible descendants. Nonnegative values participate in ordinary native traversal; positive numeric browser tab ordering is not implemented. `managedKeys` lets a composite's ancestor consume navigation keys natively before platform defaults while the private event bubbles to JavaScript. Enter/Space are always owned activation keys. JavaScript default prevention cannot retroactively cancel a native default for an unmanaged key; configure managedKeys before handling that navigation contract.

The public native ref is the actual view and retains measurement/DOM-compatible native methods. Its focus/blur methods are decorated with explicit commands during attachment and restored during cleanup. `NativePressable` composes public React Native `usePressability` with one InteractiveView, including press/long press, retention, hover delays, accessibility aliases and Android ripple options. `getNativeFocusedView()` returns the latest observed connected native target, held weakly. Focus commands do not optimistically change it; actual focus/blur and disconnection do. Same-node callback-ref replacement retains the observed target. Material overlay focus restoration uses this observation with a TextInput fallback.

`setInteractivePressed` and `setInteractiveHotspot` are lower-level feedback helpers for the same host. Stock native custom roots remain application-owned.

`onNativeFocus` and `onNativeBlur` optionally observe the standard native descendant focus channel, including TextInput. They remain separate from public `onFocus`/`onBlur`, which map the explicit host's private events. MenuList composes both channels and deduplicates the same target; these observers do not enable global View focus flags.

## Keys from native descendants

`managedDescendantKeys={['Tab', 'Escape']}` declares the two supported commands from foreign native descendants such as TextInput. The closest declaring host owns each command. Menu declares Tab on its presented list; Modal declares Escape on its presented top layer. Closed, unpresented and covered owners clear those declarations. Custom roots must forward the declaration and standard key callbacks as well as the private host callbacks.

Events originate at the actual React component for the focused native control. Its standard capture/bubble handlers run along the same event path as ancestor handlers; the ancestor is not substituted for the target. InteractiveView forwards only bridge-marked standard key events, keeping its existing private key channel for focused hosts. Child stopPropagation can prevent a later bubbling Menu/inline Modal handler. Native consumption is declared before dispatch; JavaScript cannot restore a consumed platform default.

Android emits declared hardware key-down/up with native modifiers, repeat/cancellation state and `nativeEvent.muiKeySource='hardware'`. Software-keyboard events and active composing spans are skipped. Unknown native text editors without an inspected composition API are left to the application. UIKit uses priority UIKeyCommand actions because its text/focus systems can otherwise consume Tab first. It emits key-down only with `muiKeySource='command'`, `code='Unidentified'` and no repeat bit; physical key-up and scan-code data are unavailable from that API. Marked-text composition and unknown UIKeyInput implementations are skipped. See Apple's [keyboard command priority contract](https://developer.apple.com/documentation/uikit/uikeycommand/wantspriorityoversystembehavior).

This bridge handles declared Tab/Escape only. Ordinary text editing remains native. Android window-hosted Escape follows the native Dialog request-close route on key-up, including inline child ownership, so it does not also close on the bubbling key-down. That separate native request can still arrive after a child stops JavaScript key propagation. React Native's window Escape key-up handler does not check composition or cancellation, so the bridge's composing/canceled guards do not suppress that native request. Full DOM cancellation, all foreign-control keyboard events and hardware Tab trapping are not implemented.

The private focused-host key payload includes common navigation/activation names, letter/digit physical codes, modifiers and repetition. Punctuation/keypad/layout-specific code normalization and IME are not complete browser contracts. Both platform backends and generated bindings have compile/link checks, and JavaScript event-path tests cover the adaptation. Actual hardware delivery, composition, focus-engine traversal, nested overlays, accessibility activation and keyboard layouts still require platform interaction checks. Updating this bridge requires a native rebuild, including for existing development builds.

## Reproducible build checks

`pnpm check` includes `pnpm native-host:codegen`, which generates both platform bindings under ignored `.cache/native-host-codegen`. No native SDK is needed for that schema check. `pnpm test:consumer` verifies installed native configuration/source files and excludes native compiler output from archives.

For compile-only catalog checks, generate ignored native projects with `pnpm exec expo prebuild --no-install --platform all` from `apps/native-catalog`, then use the generated Gradle project and CocoaPods workspace. The recorded Android check assembles a debug arm64 APK; the recorded iOS checks compile the library and generic simulator app. These commands do not constitute installation or interaction evidence. See [validation](validation.md) for the actual results and remaining gates.
