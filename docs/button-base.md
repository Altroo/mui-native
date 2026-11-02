# Native ButtonBase

`ButtonBase` is an unstyled native activation and focus primitive for application controls and composite library components. Root and `@mui/material/ButtonBase` imports resolve to the same implementation when the [native import mapping](installation.md) is configured. This scoped implementation precedes MenuItem/Menu/Select. Existing Button, IconButton and other catalog controls have not yet been migrated to this primitive.

```tsx
import React from 'react';
import ButtonBase, { type ButtonBaseActions } from '@mui/material/ButtonBase';

const action = React.createRef<ButtonBaseActions>();
<ButtonBase
  action={action}
  onClick={(event) => {
    /* native gesture or keyboard activation */
  }}
  focusRipple
  sx={{ p: 2, borderRadius: 1, '&.Mui-focusVisible': { backgroundColor: 'action.focus' } }}
>
  Open actions
</ButtonBase>;
action.current?.focusVisible();
```

## Installation and native host

Install the `@altroo/mui-native-host` archive alongside material and system, and rebuild the native application. The default ButtonBase uses one Fabric interaction view with React Native's public Pressability hook. It has explicit native focus/blur commands and private bubbling keyboard/focus events. Stock React Native 0.88.1 gates ordinary View imperative focus and key dispatch behind feature flags. This host does not change global flags and consumes owned activation keys before the native View click path can activate the same control again.

Expo Go does not contain this native component. A development or production native build is required to render ButtonBase. Importing material root/deep exports alone does not register or render the host. See [native host](native-host.md) for build and custom-root composition details.

## Activation, events and links

`onPress` takes precedence over `onClick`. Touch activation preserves the native gesture event. Hardware keyboard activation exposes top-level `key`, `code`, modifier/repeat/composition/cancellation fields, prevention methods and the original `nativeEvent` through `ButtonBaseActivationEvent`. It is a native gesture-or-key union, not a DOM MouseEvent. `ButtonBaseKeyEvent` also retains native event methods through its adapter.

The pinned non-button host contract activates Enter on key down and Space on key up. Nested target events do not activate the parent. Canceled Space up suppresses activation; canceling Enter down still dispatches activation, matching the source. Default prevention on the key event is separate from default prevention on the resulting activation. Native canceled/composing keys never activate. Platform hosts currently report hardware keys only; these are not TextInput IME/composition events.

The default host opens `href` with React Native Linking after the callback unless activation is prevented. A custom `LinkComponent` owns navigation. `to` requires an application-owned native link component. `component={Pressable}` and `LinkComponent={Pressable}` select the library's native host; arbitrary custom roots must forward native styles, refs, focus/keyboard handlers and press behavior. A custom root wrapping stock Pressable alone cannot guarantee native imperative focus or keyboard delivery.

## Disabled state, focus and styling

Disabled controls reject press, long press and keyboard activation, expose disabled accessibility state and leave ordinary focus traversal. The native `focusableWhenDisabled` extension permits programmatic/composite focus while keeping activation disabled. `suppressFocusVisible` supports pointer-owned composite handoff. `action.focusVisible()` uses the actual native view command. Ref identity, measurement methods and React 19 callback-ref cleanup are preserved.

Focus-visible modality follows keyboard/pointer input observed by these library controls; input occurring exclusively outside them is not globally tracked. Focus callbacks, theme `MuiButtonBase.defaultProps`, root overrides, variants, native style callbacks and supported `&.Mui-disabled`/`&.Mui-focusVisible` selectors apply. A state callback receives `pressed`, `disabled` and `focusVisible`. Literal text and text style inheritance use the shared native text scope.

ButtonBase does not impose a minimum touch size. The composing control/application owns dimensions, labels and touch targets. Android uses a native RippleDrawable, including theme color fallback, zero/automatic radius, foreground and borderless options. iOS uses pressed opacity. `disableRipple` and `disableTouchRipple` disable touch feedback; `focusRipple` provides a native outline when focus is visible and ripples are enabled. Browser ripple timing, pulsation, `TouchRippleProps`, ripple refs, nativeButton/form submission and CSS classes are outside this subset; native types omit these contracts and handled JavaScript inputs receive diagnostics.

## Evidence and open gates

Pinned original-runtime fixtures cover twelve component traces and three underlying disabled-focus cases. Native component tests cover activation provenance, callback phases/cancellation, disabled aliases, links, native refs/actions, style/text scope and private event routing. Packed-consumer checks cover root/deep identity, public native types and browser-contract rejection. Reproduce the original fixtures with `node scripts/reference/button-base.mjs --check` after the [isolated reference setup](theming.md).

Native codegen and compile/link results establish build integration. They do not establish physical hardware-key delivery, focus-engine geometry, touch/ripple appearance, VoiceOver/TalkBack, RTL, large fonts, all keyboard layouts, nested native overlays, or measured release performance. Those gates and complete upstream ButtonBase support remain open. Earlier Modal/Box focus coordination also needs verification/integration against the explicit native host before its device focus claims can broaden.
