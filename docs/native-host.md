# Native interaction host

`@altroo/mui-native-host` is an independent native dependency of the material package. It provides `InteractiveView` and `NativePressable` for native keyboard/focus composition, plus the separate [NativePicker anchor](native-picker.md) for platform selection surfaces. Its Fabric spec, Android manager/view and iOS component view ship in the local archive and are autolinked into the application. The interaction primitive adds no containing native View or global React Native feature-flag override. Picker presentation uses its own transparent native anchor. The [Portal host and canvas](portal.md) provide a separate in-window nonmodal rendering boundary.

The current peer matrix is React 19.3.0 / React Native 0.88.1, with the catalog on Expo SDK 58. The first public preview aligns all library packages at `0.0.6-prealpha.0`, using the `prealpha` dist-tag. The host wire protocol remains 0.0.5; publication does not certify a broader runtime/device matrix. This nonzero host version also satisfies CocoaPods' default minimum-version constraint.

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

`managedDescendantKeys` declares a finite set of commands from foreign native descendants such as TextInput: `Tab`, `Escape`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `PageUp`, `PageDown`, `Home`, `End` and `Enter`. For example, a composite input can declare `managedDescendantKeys={['ArrowDown', 'ArrowUp', 'Enter', 'Escape']}` before handling its popup navigation. The closest declaring host owns each command. Menu declares Tab on its presented list; Modal declares Escape on its presented top layer. Closed, unpresented and covered owners clear those declarations. Custom roots must forward the declaration and standard key callbacks as well as the private host callbacks.

Events originate at the actual React component for the focused native control. Its standard capture/bubble handlers run along the same event path as ancestor handlers; the ancestor is not substituted for the target. InteractiveView forwards only bridge-marked standard key events, keeping its existing private key channel for focused hosts. Child stopPropagation can prevent a later bubbling Menu/Modal handler. Native consumption is declared before dispatch; JavaScript cannot restore a consumed platform default.

Android claims the complete declared hardware sequence, including matching repeat/up after the popup closes or focus leaves its subtree. Retired owners cannot acquire a new input target. A short-lived Window callback delegates unrelated events and restores its predecessor after the last release. Activity and React Native Dialog windows are resolved directly; unknown application-owned windows are left alone. Android emits declared hardware key-down/up with native modifiers, repeat/cancellation state and `nativeEvent.muiKeySource='hardware'`. Matching descendant down/up events carry an optional opaque `muiKeySequence` token identifying their native device, key and press generation. Software-keyboard events and active composing spans are skipped. Unknown native text editors without an inspected composition API are left to the application. UIKit uses priority UIKeyCommand actions because its text/focus systems can otherwise consume Tab first. It emits key-down only with `muiKeySource='command'`, `code='Unidentified'` and no repeat bit; physical key-up and scan-code data are unavailable from that API. Marked-text composition and unknown UIKeyInput implementations are skipped. See Apple's [keyboard command priority contract](https://developer.apple.com/documentation/uikit/uikeycommand/wantspriorityoversystembehavior).

Ordinary text, deletion and rightward editor caret movement stay native. Declared `ArrowLeft` leaves a known editor only at an actual collapsed caret start: Android checks the current EditText selection, and UIKit checks its UITextInput range. Unknown or nonempty ranges stay native. UIKit validates this boundary through a separate command action, including when validation provides no sender. This check precedes platform consumption; a delayed JS selection receipt cannot override it. Declare only the navigation that the composite currently owns; JavaScript cannot retroactively restore a consumed native default. Changing the declaration or focus retires an Android sequence permanently, even if the original owner becomes current again before release. Cross-window focus transfer still requires separate verification. Android consumes claimed descendant releases before the native Dialog listener. A window-hosted Modal closes only when an eligible Escape-down reached it and the matching release also bubbles to it. Child stopPropagation, canceled/composing releases and retired sequences cannot take that paired route. Independent native request-close and older hosts without sequence metadata retain their platform route; those requests do not carry child propagation or composition metadata. Full DOM cancellation, all foreign-control keyboard events and hardware Tab trapping are not implemented.

The private focused-host key payload includes common navigation/activation names, letter/digit physical codes, modifiers and repetition. Punctuation/keypad/layout-specific code normalization and IME are not complete browser contracts. Both backends and generated bindings have compile/link checks. Android API 37 emulator instrumentation covers all declared names, actual input targets/callback phases, focus departure, cancellation, a native composing span, nested owners, Portal and a separate Dialog window. iOS 27.0 simulator checks cover Down/Up/Tab, text editing, nested owners, Portal and Dialog routing. Extended iOS commands remain registered but unverified: the selected XCTest driver also fails Delete/Return positive controls in a plain React Native input. A separate plain UIKit control also receives ArrowDown but no Escape from this selected driver; Autocomplete Escape cases explicitly skip only after that control proves the missing delivery. A skipped driver gate is not a support result. Actual physical keyboards, real IMEs, focus-engine traversal, accessibility activation and keyboard layouts remain open. See [catalog checks](native-catalog-testing.md). Updating this bridge requires a native rebuild, including for existing development builds.

The extended descendant declaration is source work after `0.0.6-prealpha.0`; it is not present in that published preview. Rebuild the native application from matching source when testing it. Full Autocomplete integration remains unfinished.

## Reproducible build checks

`pnpm check` includes `pnpm native-host:codegen`, which generates both platform bindings under ignored `.cache/native-host-codegen`. No native SDK is needed for that schema check. `pnpm test:consumer` verifies installed native configuration/source files and excludes native compiler output from archives.

For compile-only catalog checks, generate ignored native projects with `pnpm exec expo prebuild --no-install --platform all` from `apps/native-catalog`, then use the generated Gradle project and CocoaPods workspace. The recorded Android check assembles a debug arm64 APK; the recorded iOS checks compile the library and generic simulator app. These commands do not constitute installation or interaction evidence. See [validation](validation.md) for the actual results and remaining gates.

See [native selection](native-select.md) for NativeSelect and Select/TextField platform-picker composition, string events and native handle routing. Native-host 0.0.2-dev.0 requires rebuilding the application.

Button and IconButton now require this host through shared ButtonBase composition; see [native buttons](button.md). The earlier Button/IconButton composition change required no additional native schema/backend changes.

## Missing native components in Expo Go

If the catalog displays `UnimplementedView` for `AltrooMUIInteractiveView` or another `AltrooMUI...` component, check the running application. Expo Go does not contain this native library; JavaScript refreshes cannot add its native classes. Use a development build with `@altroo/mui-native-host` autolinked, and rebuild after native host upgrades. Do not hide the error behind stock View fallbacks, since that would remove the promised keyboard and interaction behavior.

## Native positioning observations

Host 0.0.4 adds a separate `onPortalObservation` event to the low-level Portal host. An `observationRevision` enables one native observation lease; `observedTag` selects its native anchor or zero for viewport/container-only tracking. The event includes both revision strings and the tag, window-space anchor/clipping/viewport/window rectangles, anchor availability and presentation readiness. An empty revision disables observation publication. Material's registration and stale-event handling are private; they are not additional public Portal props.

Clipping rectangles carry an explicit `present` flag and can have negative sizes after disjoint intersections. Consumers must check presentation and anchor availability, preserve those signed edges and use the revision lease to reject queued events. Native host 0.0.5 extends this transport with popup/arrow layout, actual containing-frame coordinates and explicit boundary padding boxes for [native Popper](popper.md). It requires rebuilding existing applications; 0.0.4 observation-only binaries cannot serve the new positioning protocol.

Geometry events coalesce on each platform so pending movement snapshots can be replaced by newer geometry. This is a queue safeguard, not a measured performance result. Container/eligibility invalidation renews the native observation revision, preventing pre-close snapshots from being accepted after reopening. Empty local clipping regions remain empty under rotation; affine bounds otherwise use axis-aligned rectangles, not exact rounded or rotated polygon intersections.

Android host 0.0.5-dev.1 keeps React's logical child operations in the view manager while exposing only actual physical children to Android. This corrects an accessibility traversal crash when a portal is open. Rebuild the Android application when upgrading from dev.0; a JavaScript refresh cannot replace that native implementation. The positioning protocol remains the 0.0.5 protocol.
