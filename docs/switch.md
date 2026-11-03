# Native Switch

Switch uses native views and the shared Fabric interaction host, with five replaceable slots: root, switchBase, input, thumb and track. It retains MUI-shaped composition, theming and native checked-control events. Original imports resolve to this implementation on native; web retains original MUI. A [native-host development/production build](native-host.md) is required. Expo Go does not include the host.

```tsx
import { Switch, FormControlLabel } from '@mui/material';

<FormControlLabel
  label="Automatic sync"
  control={
    <Switch
      name="sync"
      checked={enabled}
      onChange={(event, checked) => setEnabled(checked)}
      slotProps={{ input: { 'aria-label': 'Automatic sync' } }}
    />
  }
/>;
```

## State, events and focus

checked/defaultChecked control state. value is stringified for event targets, with `on` when omitted. Disabled inherits from FormControl unless explicitly supplied. readOnly suppresses owned changes. Input slot metadata takes precedence over the corresponding input props; current slotProps.input takes precedence over legacy inputProps. switchBase checked/name/value are container props and do not replace the input model, matching original SwitchBase composition.

The native input exposes role=switch by default. An authored input role can override it. Space activates on key up; Enter does not activate. Native gesture/key metadata and event methods are preserved with a checked/value/name/id/type/required/readOnly/disabled/indeterminate/node target adapter. type remains checkbox, as in original MUI's switch input. The target and currentTarget refer to the same adapter. These are native activation/value events rather than HTML ChangeEvents.

The source-shaped callback order is input click, switchBase/top-level click, input change, control change, then switchBase change bubbling. switchBase click takes precedence over the top-level click callback; onPress is the native alias. Change bubbling can still run when readOnly/default prevention suppresses the control change. Click and change are separate semantic phases over the same genuine native payload. Stopping input click propagation suppresses the base click; stopping change propagation suppresses its base change. Switch's switchBase focus/blur callbacks run before the corresponding top-level callbacks.

Controlled handles expose a proposed value during callbacks, then return to the authored model. Input change callbacks can amend target.checked/value before publication. Native readOnly retains MUI's model state even where the original browser DOM input.checked drifts temporarily. This is a deliberate native adaptation. Actual browser form submission/reset/autofill and DOM validation are not implemented.

Native activation, label taps, inputRef.focus() and action.focusVisible() check fresh disabled state, mounted/connected nodes, overlay ownership and presentation readiness. FormControlLabel now uses that same Switch pipeline, including rich-label associations. See [checked controls](check-controls.md). Actual native keyboard/IME, focus-engine and screen-reader behavior remains a physical-device gate.

## Refs and slots

The forwarded Switch ref points to the native switchBase ViewInstance, matching the source's inner-ref routing. slotProps.root.ref addresses the outer frame. inputRef receives NativeCheckedInputHandle with live readonly checked/value/name/id/type/required/readOnly/disabled/indeterminate/node fields and focus()/blur(). slotProps.input.ref addresses the actual native interaction surface. Thumb/track refs address their respective native views. action receives the shared ButtonBase focus-visible action.

Root, thumb and track slot components receive native view props, ownerState, style, children and their native ref. switchBase is a native container around the owned input and visual thumb; it must forward native container props, children and the ViewInstance ref. It must not introduce another accessible/focusable control. The input slot receives NativeCheckedInputComponentProps; NativeCheckedInputSurface is the default adapter. Custom input publishers must retain the actual native source event and value-aware target. Repeated delivery of the same native event is ignored.

Slot callbacks receive the original wrapper owner state, including color/edge/size and the authored checked prop. Uncontrolled internal checked state is not added to that wrapper owner state. The switchBase's supported Mui checked/disabled/focusVisible state selectors provide live state styling. State classes do not leak onto the root, thumb or track slots. Custom slots own their native forwarding and rendering behavior.

## Styling and motion

Default medium visuals retain the original 20 dp thumb, 34×14 dp track and 20 dp travel. Small retains a 16 dp thumb, 26×10 dp track and 16 dp travel. Native frames reserve 58×44 dp and 44×44 dp respectively, centering the small 40 dp visual geometry within its larger touch target. Original browser outer frames are 58×38 px and 40×24 px. Track percentage sizing follows the root content box when native root width/padding changes. Native logical edge offsets, light/dark/disabled colors, default color and custom icon/checkedIcon are supported. Custom icons replace the default thumb. Visual thumb/track content is hidden from accessibility; the input remains the single accessible control.

Thumb translation uses Animated with useNativeDriver=true, the theme's shortest duration and easeInOut easing. It starts at the authored position without a mount animation, handles interrupted changes and stops on cleanup. The shared reduced-motion preference snaps changes. Default track color/opacity changes are immediate; CSS background-color/opacity transition interpolation is not implemented. Native shadow index 1 supplies the thumb shadow. Actual shadows, frame pacing and gesture geometry remain device gates.

Top-level sx styles the outer root. slotProps.root.sx takes precedence over it. Top-level style and slotProps.switchBase style apply to the inner switchBase, as in the original composition. Named root/switchBase/thumb/track overrides, root variants, root size/edge overrides and switchBase color overrides remain separate. Slot sx uses native system spacing/responsive units; authored native styles preserve their native units and shorthand precedence. Input sx targets the actual interaction surface.

SwitchPropsColorOverrides, SwitchPropsSizeOverrides and all five slot override interfaces support augmentation. Custom colors need a palette entry, and custom sizes need corresponding native styles. switchClasses/getSwitchUtilityClass are available from the root, Switch and Switch/switchClasses imports. classes/className identify original slots and issue native diagnostics; they do not implement a CSS class engine. Arbitrary CSS/descendant/sibling selectors and complete DOM polymorphism remain open.

This replaces the earlier stock React Native Switch prototype. Consumers now receive genuine native gesture/key payloads rather than platform Switch nativeEvent.value; use event.target.checked or the second onChange argument. Applications that previously used only the stock prototype need the native host in their build. There is no new runtime dependency or native backend/schema change.

## Evidence and remaining gates

With the existing ignored original-package environment and React DOM artifact available, run `node scripts/reference/switch.mjs --check`, serve `.cache/switch-reference`, then execute `window.verifyReference()` in Chromium. The command verifies pinned source/provenance and fixture inputs; browser execution verifies 34 original pointer/state/event/style cases and class identifiers. Static computed-style observations disable transitions explicitly. Three additional trusted keyboard cases compare Enter, Space and canceled Space. Use the [checked-control Playwright driver](check-controls.md), replacing keyboardReferenceCases with switchKeyboardCases and verifyKeyboardReference with verifySwitchKeyboardReference.

Native tests cover the actual library with modeled nodes/events and animation configuration. Fresh consumer archives check all slots, native events/refs/actions, original import/helper identity, augmentation and browser-ref rejection. See [validation](validation.md) and [issue #35](https://github.com/Altroo/mui-native/issues/35).

Physical touch/keyboard/IME/focus engines, screen readers, nested windows, native visual/RTL/font scaling, stability and calibrated release performance remain open. Native platform-switch drag behavior, browser form contracts, complete inherited APIs and arbitrary CSS are unverified or unimplemented. These checks do not establish complete Material compatibility or alpha readiness.
