# Native form labels and helper text

FormLabel, InputLabel and FormHelperText have dedicated native props and styling. They render native text, forward TextInstance refs and retain original root/deep imports. FormControl coordinates their state with its input. Web keeps the original MUI implementations.

```tsx
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormHelperText from '@mui/material/FormHelperText';

<FormControl variant="outlined" required fullWidth>
  <InputLabel htmlFor="customer" id="customer-label">
    Customer
  </InputLabel>
  <OutlinedInput id="customer" label="Customer" aria-describedby="customer-help" />
  <FormHelperText id="customer-help">Name on the invoice</FormHelperText>
</FormControl>;
```

## State and typography

Explicit disabled/error/filled/focused/required props take precedence over their form values. In particular, false stays explicit. FormLabel uses body1 metrics and a separate required marker. Focused labels use the selected palette color, disabled labels use disabled text color, and errors take precedence. Native color/token strings remain available as an extension. InputLabel inherits FormLabel behavior and adds shrink, size, variant, margin and disableAnimation. FormHelperText uses caption metrics; its variant describes the field (`standard`, `filled`, `outlined`).

Outlined and filled helper variants have contained margins. Small form controls adjust helper spacing. A helper whose children are exactly one space reserves a line with an accessibility-hidden zero-width character. Root/asterisk, shrink, focused, variant, contained and other implemented named overrides receive their corresponding state. Caller native styles and their padding/margin shorthands remain effective after generated defaults.

FormControl applies none/dense/normal margins, full width, native root refs and a stable state context. Its div/fieldset root aliases render native Views; label/legend/span/p/div aliases render native Text. Native groups still need appropriate accessibility roles from their actual controls. Use one input per FormControl; registering multiple inputs emits a diagnostic. `useFormControl` remains undefined outside a provider.

## Floating labels

TextField and composed InputLabel/FormControl fields use floating labels by default. Automatic shrink follows the containing form's filled, focused and adorned-start state. An explicit shrink value wins. Standalone labels can request shrink directly. Variant and size choose the resting/shrunk offsets. Outlined labels coordinate with the measured notch; TextField passes its label and explicit shrink setting to the input component. The input placeholder is visually hidden beneath an idle unshrunk label and restored on focus or shrink, following the pinned input rules.

Native transforms request the native animation driver with the pinned default 200 ms ease-out timing. disableAnimation and the system reduced-motion setting snap to the target state. One shared native preference subscription serves animated labels; it ignores stale results and releases its listener when unused. Enabling reduced motion during an active transition stops the animation and restores the final text width. Color changes remain immediate, and complete theme transition configuration/CSS timing is unfinished.

The form's measured width bounds long labels. Width expands after shrinking finishes, allowing the final scaled text to use the available space without overflowing during motion. This avoids animating layout width on every frame and differs from browser max-width transitions. These are source/component-test contracts; physical clipping, font scaling, RTL geometry and animation smoothness still need device validation.

For native layouts that need a label above the field, use the native extension:

```tsx
<TextField label="Customer" labelDisplay="stacked" />
```

The same option is available on FormControl. Stacked labels stay in normal flow, preserve the placeholder and suppress the automatic outline gap. Keep this extension in platform-specific code when web uses original MUI.

## IDs, focus and descriptions

TextField creates stable field/label/helper IDs when none are provided. Explicit native IDs remain usable; an explicit field id supplies the managed label/helper IDs. Change-event target.id now reflects the actual assigned field ID, including automatic IDs.

Within one FormControl, label htmlFor resolves against the registered input ID. Pressing a matching enabled label focuses its native input. Native onPress or the onClick alias runs first; preventDefault skips activation. Registration follows ID/ref changes and cleans up on unmount. Custom native input components must forward the supplied ref and native focus/blur/value handlers.

Textual labels provide a native name fallback and, when appropriate, Android labelled-by linkage. Explicit names win automatic associations; mismatched IDs remain unlinked. Helper descriptions become native hints. With several helper messages, set aria-describedby to their IDs in the desired order; matching descriptions are combined, and removing a helper preserves surviving messages. Explicit accessibilityHint takes precedence. Automatic text extraction handles supplied strings, numbers and textual children; custom rendered meaning should use an explicit native accessibilityLabel/accessibilityHint.

These associations are scoped to the containing form/TextField. Browser-global DOM ID lookup, arbitrary external description nodes and complete browser focus behavior remain unfinished. Native instance routing and event payload tests do not establish VoiceOver/TalkBack behavior.

## Migration from the early native prototype

TextField's default label presentation is now floating. Set labelDisplay="stacked" to retain the previous native flow layout. FormHelperText.variant now follows MUI's field-variant contract; use sx typography or native text styles for a custom text variant. TextField's top-level testID continues to target the editable host; use root slot testID for the field container. Separate root/input/host styles and the documented TextField native event ordering remain in place.

Public OutlinedInput can be used directly as TextField's input slot. InputLabel/helper slot props are typed for their own contracts. Installed consumers exercise label/helper augmentation, native slots, original imports and browser-ref rejection. React Native currently shares structural types for some text/view instances, so TypeScript does not distinguish every wrong native handle. Animated ref attachments can cycle as native props change; returned React 19 cleanup functions run for each released attachment.

## Evidence and remaining work

Run `node scripts/reference/labels.mjs --check` after the isolated [reference setup](theming.md). It checks immutable package integrity, selected source bytes and MIT identity before comparing 16 state/marker cases and the transition default. Normal tests use the checked-in fixture. Adapted hashes and notices remain recorded without advancing verified upstream support.

Tests cover state precedence, focus/ID links, helper ID lists/removal, reserved lines, floating/stacked modes, placeholder state, native refs/cleanup, measured width, driver configuration and reduced-motion races. Native rendering, keyboards, screen readers, large fonts, RTL, historical crash resolution, release performance, full CSS classes/transitions and global browser semantics retain their separate gates. No alpha publication or full MUI-version compatibility is claimed.
