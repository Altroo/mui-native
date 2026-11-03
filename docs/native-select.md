# NativeSelect and platform-native selection

NativeSelect, Select with `native`, and TextField's native select branch present UIKit selection rows in an adaptive sheet/iPad popover and Android framework choice rows. They reuse the library's native Input/FormControl presentation. A native development build is required; install the material, system and native-host archives together and rebuild after updating the host. See [installation](installation.md) and [native picker](native-picker.md). Web resolution continues using original MUI.

```tsx
import React from 'react';
import { NativeSelect, Select, TextField } from '@mui/material';

export function Choice() {
  const [value, setValue] = React.useState('one');
  return (
    <TextField
      select
      label="Choice"
      value={value}
      slotProps={{ select: { native: true } }}
      onChange={(event) => setValue(event.target.value)}
    >
      <option value="one">One</option>
      <optgroup label="Other choices">
        <option value="two">Two</option>
      </optgroup>
    </TextField>
  );
}

const standalone = (
  <NativeSelect defaultValue="one">
    <option value="one">One</option>
  </NativeSelect>
);
const select = (
  <Select native defaultValue="one">
    <option value="one">One</option>
  </Select>
);
```

`option`, `optgroup` and Fragment children are configuration, parsed before native rendering. HTML nodes are never mounted. Supply readable literal option text, unique React keys and optional value/label/disabled attributes. Other child components and nested optgroups are rejected. Omitted values use collapsed option text. A nonempty label overrides visible text; an empty label retains its metadata while native rows display the text.

## Values, events and refs

Native selection uses browser-shaped strings. Numeric authored values match their string representation. Single controlled `value` overrides requests; `defaultValue` initializes uncontrolled selection. Option identity follows its React key through reordering/value updates. Initial fallback skips disabled options/groups; authored missing-value fallback follows React DOM's own-option disabled rule. Changing defaultValue alone does not reset selection. A multiple-mode change reapplies its default. See the pinned reference cases for edge conditions.

Standalone NativeSelect configures multiple selection through `inputProps={{ multiple: true }}`. Select uses `native multiple`; TextField uses `slotProps={{ select: { native: true, multiple: true } }}`. In multiple mode, `event.target.value` is the first selected string in option order. Read all selected values with `Array.from(event.target.selectedOptions, option => option.value)`. This differs from default Select's raw array-valued event. Toggles apply immediately; Done/Cancel dismiss without rolling back accepted changes. Native presentation stays collapsed into one control even with multiple or `inputProps.size`; browser inline-list layout is not implemented.

`onChange(event)` receives one argument, retains the original persisted native payload and methods, and adds value/name/id/type/multiple/selectedIndex/options/selectedOptions/node targets. target and currentTarget describe the same selection. Collections expose item(index) and namedItem(id). Their option records describe the callback snapshot; disabled is the option's own flag. A controlled ref temporarily exposes the proposed selection during its callback and then returns to the authored value.

The forwarded root ref is a native ViewInstance. inputRef receives NativeSelectInputHandle with focus(), blur(), the actual native trigger node and readonly selection fields. No HTMLSelectElement or editable/hidden TextInput is mounted. Browser form submission, reset, autofill, mutable DOM collections and arbitrary DOM methods are not implemented.

```tsx
import { type NativeSelectInputHandle } from '@mui/material';
const control = React.createRef<NativeSelectInputHandle>();
const field = (
  <Select native inputRef={control}>
    <option value="one">One</option>
  </Select>
);
control.current?.focus();
const values = control.current?.selectedOptions.map((option) => option.value);
```

Enter, Space and arrow keys request the native picker. Keyboard callbacks use ButtonBaseKeyEvent. Composing, canceled, disabled, read-only, disconnected and covered requests cannot open or change it. Native framework rows own navigation while presented. Initial autofocus waits for parent readiness; enabling autofocus later focuses an idle control. Composite focus suppresses the trigger's temporary picker blur; explicit blur closes without restoring focus. Ownership is retained until the native dismissal acknowledgement, including programmatic closure, so parent overlays cannot reclaim focus while the native window is closing.

## Input composition and styling

NativeSelect clones Input by default, including when its select variant is overridden. Supply input to choose a different container. Native Select uses the matching standard/filled/outlined input. TextField supports current slots.select/slotProps.select and retained legacy SelectProps; the current select slot replaces the legacy object. Custom inputs must preserve native host routing, refs, events and private selection metadata. Replacing the input slot entirely transfers that responsibility to the caller.

NativeSelect's inputProps and the supplied input's inputProps follow the original wrapper precedence. Native filled/required/error/disabled state, labels, helpers and outline notches reuse Input/FormControl. Standard and framed carets reserve 24 and 32 dp before authored overrides. End adornments precede a separately positioned caret without adding another accessible control. Multiple native selection hides the caret. MuiNativeSelect defaults, native sx and named select/icon/variant/error/multiple overrides are supported. Inline input styles win over named overrides. Root and icon styles remain separate. Class helpers preserve original identifiers; className and arbitrary CSS are not native styling implementations.

NativeSelectInput and nativeSelectClasses are also available under the original NativeSelect deep paths. NativeSelectModeProps<Value> retains authored value typing while its event/ref values remain strings. TextFieldNativeSelectProps<Variant> types literal native select fields. Original Select onOpen/onClose/open/renderValue/MenuProps are not native framework picker controls. Use nativePickerProps for title, colorScheme, button labels and onPresentationChange; it cannot replace options, selection or dismissal ownership. Raw native events have no fabricated browser pointer data.

## Evidence and remaining gates

Thirty-two actual Chromium cases execute integrity/source/license-verified MUI 9.5.0 and React DOM 19.3.0. They cover strings, option/group flags, defaults, controlled restoration, duplicate values, node identity, multiple resets, list-size policy and wrapper composition. Build with `node scripts/reference/native-select.mjs --check`, serve `.cache/native-select-reference` over loopback and use its Verify button. The page compares live original behavior with the committed fixture. Required cached reference artifacts are the pinned Material/React DOM archives and installed reference packages; the probe does not fetch or upgrade them.

Native tests exercise library composition with modeled nodes and native events; installed archives verify import identity, refs, event types and current/legacy field composition. Codegen and both-platform compile/link checks validate the changed native protocol. See [validation](validation.md) and [issue #32](https://github.com/Altroo/mui-native/issues/32).

Physical picker presentation/dismissal, hardware keyboard/IME, focus engines/full Tab trapping, nested windows, row scrolling, VoiceOver/TalkBack, RTL/font scaling, rotation/activity restoration, stability and release-build performance remain open on iOS and Android. Native compilation and modeled events do not establish those behaviors. No whole-package support promotion, npm publication or paid feature parity is implied.
