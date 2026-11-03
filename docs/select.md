# Native Select

Select composes the native Input variants, Menu and MenuItem. It is available from the material root and original `@mui/material/Select`, `Select/selectClasses` and `Select/SelectInput` paths through the [native resolver](installation.md). This is an adapted MUI 9.5.0 subset. Rendering requires the [native interaction host](native-host.md) in a development or production build; Expo Go does not include it.

```tsx
import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';

export function Choice() {
  const [value, setValue] = React.useState('a');
  return (
    <FormControl>
      <InputLabel id="choice-label">Choice</InputLabel>
      <Select<string>
        labelId="choice-label"
        label="Choice"
        name="choice"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      >
        <MenuItem value="a">Alpha</MenuItem>
        <MenuItem value="b">Beta</MenuItem>
      </Select>
    </FormControl>
  );
}

export function CompactChoice() {
  return (
    <TextField select label="Choice" defaultValue="a" helperText="Choose an option">
      <MenuItem value="a">Alpha</MenuItem>
      <MenuItem value="b">Beta</MenuItem>
    </TextField>
  );
}
```

These examples use original imports after configuring Metro and native TypeScript mapping. Direct `@altroo/mui-native` imports use the same components. Web keeps original MUI. No npm release exists; use the [local archives](installation.md).

## Values and activation

Controlled `value` and uncontrolled `defaultValue` retain raw values. Primitive options match using string representation; object values require reference identity. `multiple` requires an array and toggles by strict array membership. Display follows option order while the selected array preserves toggle order. An empty string means no selection unless `displayEmpty` supplies one. `renderValue` owns custom display content. Whitespace-only string output renders empty.

Options must be direct valued children, usually MenuItem. Disabled options cannot activate. Nonvalued grouping content is retained, but HTML `option`/`optgroup` elements and fragments are rejected. For custom or function-rendered labels, provide accessible native content, `renderValue` as needed, and MenuItem `textValue` for searchable text. The default display truncates literal single text; rich renderValue content owns its layout.

Touch opens after a completed native press, rather than browser mousedown. Enter, Space, ArrowUp and ArrowDown open the list. MenuList owns open-list navigation and typeahead. Closed Select typeahead resets after 750 ms and supports prefix matching and repeated-character cycling. Disabled/read-only controls ignore activation. Composing, canceled and stale events are guarded. Space key phases avoid selecting twice or selecting the item under the opening gesture. Covered/unpresented/unmounted menus cannot activate retained item callbacks.

Open state is controlled by `open` when supplied; `onOpen` and `onClose` are requests. MenuProps can override inherited menu policy, including its own open/onClose, so the caller then owns consistency. Menu retains its [native dismissal and focus boundaries](menu.md). The default return focus ref points to the real trigger, including when its first focus request has not yet produced an observed native event. Caller returnFocusRef overrides remain supported.

## Events and refs

`onChange(event, child)` receives the actual option element and a native event adapter with `{ value, name }` on target/currentTarget. Option onClick runs before change, then single selection requests close. The event is persisted before adaptation; its nativeEvent payload and source methods remain available. The value/name target is mutable without mutating the original native event or the selection. This is a native gesture/key contract, not a DOM ChangeEvent, MouseEvent or browser autofill event. Keyboard selection preserves its native key source. Blur supplies value/name on target as well.

The forwarded Select ref is the Input root `ViewInstance`. `inputRef` receives a `SelectInputHandle<Value>` with focus(), blur(), actual native trigger node and raw value, including the empty-string sentinel or undefined. It is not an HTMLInputElement or TextInput. No additional hidden/editable TextInput is mounted, so the default control does not open a software keyboard. Native browser form submission, hidden-input serialization, autofill and reset contracts are not implemented.

```tsx
import { type ViewInstance } from 'react-native';
import { Select, type SelectInputHandle } from '@mui/material';

const root = React.createRef<ViewInstance>();
const control = React.createRef<SelectInputHandle<string[]>>();
<Select<string[]> ref={root} inputRef={control} multiple defaultValue={[]} />;
control.current?.focus();
const values = control.current?.value;
```

Custom input components must preserve native root/ref/layout, Input slot routing and event forwarding. Custom display, icon, paper and list components likewise own their native forwarding contracts. A stock View cannot replace an interaction host without supplying those contracts.

## Fields, slots and styling

Outlined, filled and standard variants reuse the actual Input implementation, FormControl state, required/error/disabled flags, adornments and label/helper links. TextField select replaces its editable host, preserving a single control. `slots.select`, `slotProps.select` object/owner-state callback, and legacy SelectProps are supported. A select slot prop replaces the legacy object, following TextField slot precedence. Defaults and explicit undefined values retain the controlled/uncontrolled ownership policy. Stacked native labels suppress the default displayEmpty outline notch unless explicitly overridden.

Scalar TextFieldProps defaults still type change values as string. The original first generic remains the variant (`TextFieldProps<'outlined'>`); an optional second generic types native select values (`TextFieldProps<'outlined', string[]>`). `TextFieldSelectProps<Value>` describes a literal select field. `NativeTextFieldProps` is the scalar native text contract for components that parse native text events.

MenuProps forwards the native Menu slots. Paper/list slot callbacks receive Select owner state. The default menu is centered below the Input root and reserves that root's measured minimum width, including controlled closed initialization; `autoWidth` removes the minimum. Authored paper styles win. Layout and anchor measurement use public native geometry, with stale measurement guards.

MuiSelect defaults, root overrides/variants, named select/icon/variant/error/multiple/iconOpen overrides, supported sx and SelectDisplayProps styles are resolved separately. Root styles do not leak into the display or icon. Standard caret space is 24 dp, outlined/filled 32 dp, before authored slot overrides. Physical insets follow the existing Input native RTL swapping policy. Named class helpers provide original identifiers only; className, arbitrary CSS and ClassNameGenerator styling are not native implementations. The built-in triangle is an independently authored native view, not the complete SvgIcon inventory.

## Evidence and remaining gates

The original-runtime probe executes 32 SelectInput interaction cases, three wrapper cases and class helpers against integrity/source/license-verified MUI 9.5.0. It covers raw values and imperative handles, identity, multiple ordering, keyboard/typeahead timing, callback order, width/owner state, overrides and display policy with controlled DOM refs, clock and Menu slots. Native tests exercise actual library composition with explicit node/event/geometry models. Installed archives verify root/deep identity, generic values, variant generics, native refs, slot owners and rejected browser contracts. See [validation](validation.md) and [issue #30](https://github.com/Altroo/mui-native/issues/30).

`native={true}`, NativeSelect and platform-picker mode remain separate unfinished work and are rejected explicitly. Do not substitute HTML options. Browser opening-mouseup geometry suppression, autofill/form behavior, arbitrary DOM/CSS contracts, complete inherited/generic APIs and custom rich-text layout equivalence are not established.

Physical keyboard/IME, focus engines, full Tab trapping, native overlay/scroll geometry, safe areas, keyboard avoidance, VoiceOver/TalkBack announcements, RTL/font scaling, stability and release-build performance remain open on both platforms. These tests do not establish visual or physical-device parity. This increment changes JavaScript/TypeScript only; the Fabric spec and platform backend bytes are unchanged. No upstream verified/released support, npm publication or paid feature parity is implied.
