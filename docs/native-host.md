# Native interaction host

`@altroo/mui-native-host` is an independent native dependency of the material package. It provides `InteractiveView` and `NativePressable` for native keyboard/focus composition. Its Fabric spec, Android manager/view and iOS component view ship in the local archive and are autolinked into the application. No WebView, extra containing native View or global React Native feature-flag override is used.

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

The key payload includes common navigation/activation names, letter/digit physical codes, modifiers and repetition. Punctuation/keypad/layout-specific `code` normalization and IME are not complete browser keyboard contracts. The private key channel currently emits from focused interaction hosts. Hardware-key adaptation from raw native controls such as TextInput remains unfinished; focus observation alone does not bridge their keys. Focus restoration, native focus-engine traversal, nested overlays, accessibility activation and keyboard layouts require actual platform interaction checks.

## Reproducible build checks

`pnpm check` includes `pnpm native-host:codegen`, which generates both platform bindings under ignored `.cache/native-host-codegen`. No native SDK is needed for that schema check. `pnpm test:consumer` verifies installed native configuration/source files and excludes native compiler output from archives.

For compile-only catalog checks, generate ignored native projects with `pnpm exec expo prebuild --no-install --platform all` from `apps/native-catalog`, then use the generated Gradle project and CocoaPods workspace. The recorded Android check assembles a debug arm64 APK; the recorded iOS checks compile the library and generic simulator app. These commands do not constitute installation or interaction evidence. See [validation](validation.md) for the actual results and remaining gates.
