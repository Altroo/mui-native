# Native TextField slots and refs

TextField supports `root`, `input`, `htmlInput`, `inputLabel` and `formHelperText` component slots. Each has object or owner-state callback props. Native owner state includes resolved field flags, variant, size and current focus. Theme defaults merge named slot entries before rendering.

| Slot           | Default component      | Ref instance      | Style target    |
| -------------- | ---------------------- | ----------------- | --------------- |
| root           | FormControl            | ViewInstance      | Field container |
| input          | NativeTextFieldInput   | ViewInstance      | Input container |
| htmlInput      | React Native TextInput | TextInputInstance | Editable host   |
| inputLabel     | InputLabel             | TextInstance      | Label text      |
| formHelperText | FormHelperText         | TextInstance      | Helper text     |

`input` is the component around the editable host. `htmlInput` is the host itself, despite the upstream browser-oriented name. `NativeTextFieldInput` is a native extension for composing a replacement input component. It shares the [input primitives](inputs.md) engine; the public input components retain their own scoped contracts. It accepts `inputProps`, `inputRef` and `slots.input`, allowing TextField's editable-host replacement to reach the nested input.

```tsx
import React, { forwardRef } from 'react';
import { TextInput, type ViewInstance } from 'react-native';
import TextField from '@mui/material/TextField';
import { NativeTextFieldInput, type TextFieldInputSlotProps } from '@altroo/mui-native';

const CustomerInput = forwardRef<ViewInstance, TextFieldInputSlotProps>((props, ref) => (
  <NativeTextFieldInput {...props} ref={ref} />
));

<TextField
  label="Customer"
  helperText="Name on the invoice"
  slots={{ input: CustomerInput, htmlInput: TextInput }}
  slotProps={{
    root: { sx: { mb: 2 } },
    htmlInput: (state) => ({ autoCapitalize: 'words', testID: state.focused ? 'active' : 'idle' }),
  }}
/>;
```

Keep native extensions in platform-specific code when the web application uses original MUI. Custom slot components must forward managed values, event handlers and refs, and consume `ownerState` before spreading props onto a native host. Root components also receive form flags; a custom root that does not render FormControl still has a field context around its children. DOM tag strings and browser element refs are rejected by the native declarations.

## Precedence and events

Top-level `style` and `sx` apply to the field root; root slot styling comes afterward. Input-container `style`/`sx` and editable-host `style` are separate. A top-level `testID` retains the existing native extension targeting the editable host; use `slotProps.root.testID` for the field container.

Input slot ordinary props, including its value, initial defaultValue and handlers, override their top-level counterparts, following the upstream input-component contract. Keep value and change handling consistent at that level. The field still records uncontrolled changes internally. The default adapter emits an MUI-shaped `onChange` with `target.value/name/id`, then the effective `onChangeText`, then the htmlInput native `onChange` and `onChangeText`. Host value and change plumbing remain managed by the adapter. Identical focus, blur and text callbacks at the input and host levels run once. Focus changes schedule owner-state updates before callbacks are notified.

Native safety rules remain authoritative: slot flags cannot re-enable a disabled TextField or override an explicit read-only/non-editable input alias. A more restrictive input slot can disable the input. Root field flags retain the resolved TextField values. An explicit `aria-label` wins over a host slot name; native accessibility hints use supplied helper text when no hint is given. These rules do not establish screen-reader behavior on a device.

## Ref lifecycles

The forwarded TextField ref and `slotProps.root.ref` share the root instance. The input slot ref targets its container. Top-level `inputRef`, input slot `inputRef`, nested `inputProps.ref` and `htmlInput.ref` reach the editable host. InputLabel/FormLabel/FormHelperText now forward their text refs; FormControl forwards its native view ref.

`useForkRef` and `setRef` are available from `@mui/material/utils` and the native Material root. `useForkRef` supports callback and object refs, React 19 callback cleanup returns, replacement, unmount and idempotent release. Unchanged ref lists retain callback identity. A stale cleanup does not clear a later attachment. Cleanup attempts every attached ref even when one throws; attachment failure rolls back previously assigned refs. `setRef` is a low-level setter: use it within an owned ref lifecycle and arrange cleanup yourself. `mergeSlotProps` still does not compose refs automatically.

## Evidence and remaining work

The pinned Material UI/Utils 9.5.0 reference covers two structural routing cases, three input-container default-value cases and one attachment/detach sequence. Run `node scripts/reference/textfield-slots.mjs --check` after the isolated reference setup in [theming](theming.md). It verifies pinned artifact integrity, license identity and selected source bytes before execution. Original browser rendering peers stay in the ignored reference directory and never enter native runtime packages. Reuse hashes and MIT notices remain recorded independently of upstream compatibility status.

Component regressions cover all five custom components, live callbacks, inherited form flags, controlled/uncontrolled values, event ordering, duplicate handler prevention, style separation, native naming and ref replacement/cleanup. Fresh packed consumer checks compile original root/deep imports and reject browser tags/refs. Structural reference cases are not complete TextField equivalence.

Public input variants, adornments and a measured outline gap now have scoped implementations described in [native inputs](inputs.md). The select slot, complete input contracts, floating labels, browser-only props, complete focus/validation behavior and other component slots remain unfinished. Actual iOS/Android visual geometry, keyboard interaction, screen readers, RTL, font scaling, crash resolution and release performance require separate native validation. This increment does not advance verified upstream support or publish an alpha.
