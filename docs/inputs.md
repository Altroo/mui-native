# Native input primitives

`InputBase`, `Input`, `FilledInput`, `OutlinedInput` and `InputAdornment` are available from the native Material root and their original `@mui/material/Component` imports through the native resolver. They share one native state/rendering engine with TextField. The browser resolver continues using original MUI.

```tsx
import React from 'react';
import { type TextInputInstance } from 'react-native';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

const inputRef = React.createRef<TextInputInstance>();

<OutlinedInput
  aria-label="Amount"
  inputRef={inputRef}
  defaultValue="0"
  startAdornment={<InputAdornment position="start">$</InputAdornment>}
  endAdornment={<InputAdornment position="end">USD</InputAdornment>}
  onChange={(event) => console.log(event.target.value)}
/>;
```

The outline or underline belongs to the entire control, including adornments. The editable TextInput is borderless. InputBase supplies minimal text/reset styling; Input adds an underline, FilledInput adds a filled surface and optional underline, and OutlinedInput draws an outline with an optional measured label gap. Native editable targets keep a minimum height of 44 dp. This is a native layout choice, not exact browser pixel equivalence.

## Values, events and refs

Values/default values accept strings or numbers. `inputProps` and `slotProps.input` can override the host value; slot props take precedence. The native adapter emits `onChange` with `target.value/name/id`, `currentTarget` and the original native payload. Public input primitives notify the effective native host `onChange` before the top MUI-shaped `onChange`, matching the pinned input routing. Native `onChangeText` follows. Shared focus, blur and text handlers are deduplicated.

TextField keeps its previously documented native extension: its host value/change plumbing stays managed and its input callback precedes native host callbacks. Both paths use the same input engine. This difference concerns native callback integration; browser events and DOM elements are not exposed.

The forwarded component ref and root slot ref target a ViewInstance. `inputRef`, `inputProps.ref` and input slot refs share the TextInputInstance, including React 19 callback cleanups. Custom `inputComponent`/`slots.input` components must forward those refs and managed event/value props, consume `ownerState`, and strip `sx` before spreading props onto TextInput. Custom roots follow the native View contract. Touching bare root padding focuses the input; touches originating inside interactive children do not request another focus.

Top-level `testID` targets an input primitive's root. TextField preserves its own top-level host testID behavior. Root styles/sx and editable-host style/sx are distinct. Native padding shorthands expand within each style layer so caller padding overrides generated edges. Numeric caller vertical insets participate in row-height bounds; percentage-padding geometry still needs native validation. Theme default props and root/input overrides apply to both InputBase and its selected variant. InputBase size/color augmentation is checked through an installed original deep import; custom values need corresponding theme styling/tokens.

Disabled, read-only and non-editable aliases remain restrictive: a lower-level editable alias cannot re-enable a locked control. Disabling a focused input requests native blur and clears logical focus immediately. User blur callbacks receive the actual native event when the host delivers it, including delayed delivery; no synthetic browser event is fabricated. This does not perform browser constraint validation. Native focus/keyboard events retain native event types.

## Forms and adornments

FormControl shares disabled/error/required flags, color, size, variant, hiddenLabel, focus, filled and adorned-start state. Its callback/provider identities remain stable across unrelated renders. `useFormControl` is available from `@mui/material/FormControl` and returns undefined outside a form provider. Focus/error/disabled state updates label colors. The editable-host subtree receives a cleared context so nested input implementations do not register as another child of the outer form.

Use one input control per FormControl, as in MUI. Complete multi-input registration diagnostics are not implemented. Native floating/stacked label layouts and scoped focus/name/helper links are documented in [forms and labels](form-labels.md). Actual native design and interaction verification remains open.

InputAdornment supports start/end positions, text or composed children, native root refs/styles, pointer-event disabling and optional Typography wrapping. Raw text remains inside a native Text even with disableTypography, since React Native cannot put raw strings directly in a View. Use an accessible IconButton or another native control for interactive adornments. Actual touch, focus and screen-reader behavior needs device checks.

## Multiline and outlines

`multiline` uses TextInput. Positive integer `rows` fixes the rendered row height; `minRows` and `maxRows` bound content-size growth. Fixed rows take precedence. Native content-size events update height within those limits. This replaces browser textarea measurement and is covered by synthetic content-size tests; platform font scaling, keyboard resizing and exact line wrapping remain native validation work.

OutlinedInput supports label/notched and a typed notchedOutline slot. The label reserves outline space; it does not supply the editable input's accessible name. Supply aria-label or compose a label explicitly. Required labels reserve an asterisk. Explicit notched wins over automatic focus/fill/adornment state. The default decorative outline measures label width, bounds the gap within the control, uses logical start/end positions and hides its measurement text from accessibility. Geometry, rounding, RTL and large fonts are not visually verified on devices yet.

## Evidence and limits

The integrity-checked Material UI 9.5.0 fixture compares routing/event precedence for four input components and three required/overridden outline-label cases. Run `node scripts/reference/inputs.mjs --check` after the isolated [reference setup](theming.md). Normal tests use checked-in fixtures; original MUI/Emotion remain outside the native runtime dependency graph. Source hashes and MIT notices are retained without promoting upstream compatibility status.

Component tests exercise controlled/uncontrolled state, host precedence, restrictive aliases, distinct adornment/outline layout, shared form state, ref cleanup/root focusing, multiline bounds, variant styling and measured gap state. Fresh tarball consumers compile original imports and reject DOM tags, invalid native refs and unsupported props.

This is a declared subset. Full CSS classes/selectors/animations, browser validation/autofill/pointer behavior, all adornment styling, global browser ID associations and complete upstream export/prop equivalence remain unfinished. Multiple-input registration now emits a native diagnostic. Current iOS/Android rendering, keyboards, screen readers, RTL, font scaling, historical crash fixes and release performance require separate native evidence. No alpha or complete version-support claim is made.
