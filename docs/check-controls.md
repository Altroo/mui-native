# Native Checkbox, Radio and labels

Checkbox and Radio compose the native ButtonBase interaction host with separate visual roots and one focusable input surface. RadioGroup, FormGroup and FormControlLabel provide scoped grouping and labels. Original MUI imports resolve to these implementations on native; web continues using original MUI. A development/production build containing the [native host](native-host.md) is required. Expo Go does not include it.

```tsx
import { Checkbox, Radio, RadioGroup, FormControlLabel, FormGroup } from '@mui/material';

<FormGroup>
  <FormControlLabel label="Send a receipt" control={<Checkbox defaultChecked />} />
</FormGroup>;
<RadioGroup name="delivery" defaultValue="email" onChange={(event, value) => setDelivery(value)}>
  <FormControlLabel label="Email" control={<Radio value="email" />} />
  <FormControlLabel label="Post" control={<Radio value="post" />} />
</RadioGroup>;
```

## Values and events

checked/defaultChecked provide controlled/uncontrolled state. Radio uses its own checked prop before the group's value comparison. Primitive group values compare by string, while object values compare by identity. Input event values and the RadioGroup onChange second argument are strings, including numeric authored values. An omitted input value is `on`. Group value/defaultValue retain their authored values until an uncontrolled change publishes its input string.

onChange receives `(event, checked)` with checked/value/name/id/type/disabled/readOnly/required/indeterminate and the actual native node on event.target. currentTarget refers to the same target adapter. Native gesture/key payloads and actual event methods are preserved; this is not a browser ChangeEvent or HTML input. Controlled handles expose the proposal during callbacks and return to authored state afterward. Callback changes to target.checked/value reach the control/group publication path. Preventing the default suppresses the owned state change. Input click/change callbacks run before the control callback; input click propagation can suppress the root click.

Disabled controls do not activate. readOnly preserves the native model and suppresses the control/group change after input callbacks. Original browser input.checked can drift during a read-only click while MUI's visual model remains unchanged; native retains that model deliberately. indeterminate stays authored and exposes native mixed state. Browser form submission, validation, autofill/reset, defaultChecked mutations on a hidden DOM input and global named-radio coordination are not implemented.

Space activates on key up; Enter does not activate checked controls. Scoped radio arrows wrap through enabled, connected controls with the same effective name. Horizontal direction reverses in RTL. Input key handlers can cancel navigation or Space. Native readiness, current overlay ownership, disconnected/unmounted controls and canceled/composing activation are guarded. Registration uses native document order and updates after keyed reorder, removal and disabled changes. Actual hardware keyboard/IME/focus-engine behavior remains unverified.

## Native refs and slots

The forwarded ref addresses the outer native ViewInstance. inputRef receives NativeCheckedInputHandle with focus(), blur(), readonly live target fields and node. slotProps.input.ref addresses the actual native input ViewInstance. action receives the shared ButtonBase focus-visible action. RadioGroup's native actions extension supplies focus(), selecting the checked enabled control or the first enabled control for focus. useRadioGroup and RadioGroup/useRadioGroup expose name, value and onChange only.

Checkbox/Radio support native root and input slots with owner-state callbacks. Current slotProps.input wins over legacy inputProps. Root/input names, values and handler overrides follow the documented target pipeline. Root callbacks and styles are controller inputs, while a custom root component receives native container props, ownerState, style, children and the ref. It must forward those native props/ref. It is not another input or ButtonBase, and must not add a second accessible/focusable control.

A custom input receives native interaction props, model fields and a value-aware onChange publisher. Forwarding NativeCheckedInputSurface is the default adapter; it consumes checked-control metadata before rendering the native host. Forward the actual ref and native callbacks. Custom change publication must retain the genuine source event. Repeating the same native event is ignored. An incompatible input type is rejected. Browser string roots and HTML refs are unsupported.

## Labels, layout and themes

FormControlLabel copies checked/name/value/onChange only when the control does not supply them. Disabled precedence is label, control, then FormControl. Required precedence is label, then control; FormControl alone does not make a control-label required. Error inherits from FormControl unless supplied. All four placements are supported, with native spacing and a separate 44 dp label hit area. Checkbox/Radio label activation enters the same control pipeline and respects disabled/readOnly/cancellation and presentation ownership. Switch now shares that checked-control presentation and activation pipeline; see [native Switch](switch.md).

Plain labels supply a readable native name. Opaque rich labels retain their visible text and a native accessibilityLabelledBy association; provide an explicit aria-label/accessibilityLabel when the platform cannot derive the desired name. Actual VoiceOver/TalkBack behavior remains open. Existing Typography labels are preserved, disableTypography skips wrapping, and slots.typography/slotProps.typography customize generated labels. Default wrapping uses a text span for text content and a native View boundary for opaque content, preserving typography defaults/metrics without placing Views under Text. Explicit typography slot components own their native content/forwarding contract.

Checkbox/Radio retain at least 44 dp targets and native geometric glyphs. Custom icon/checkedIcon and Checkbox indeterminateIcon are supported, with inherited font size/color; no new icon runtime is required. Color/size augmentation, root styles/variants, supported sx states, native style callbacks and logical edge margins are available. FormGroup supports row wrapping and inherited error styles. Native style shorthands preserve caller precedence. Class helpers identify original slots; classes/className do not implement CSS.

Checkbox, Radio, RadioGroup, FormGroup and FormControlLabel expose original class-helper subpaths. Checkbox/Radio size/color and slot override interfaces support module augmentation. Complete upstream TypeMap/DOM polymorphism, arbitrary CSS and all inherited browser APIs remain open.

Switch now provides five native slots and shares the checked-control activation pipeline. See [native Switch](switch.md) for callback phases, refs, styling, motion and migration from the earlier stock-control prototype.

## Evidence and reproduction

The original Material UI 9.5.0 / React DOM 19.3.0 artifacts, executed source files and MIT licenses are verified before building the reference. With the existing ignored original-package environment and React DOM artifact available, run `node scripts/reference/check-controls.mjs --check`, serve `.cache/check-controls-reference`, and execute `window.verifyReference()` in Chromium. This reproduces 25 pointer/state/label cases and class identifiers. The check command verifies source/provenance and fixture inputs; browser execution verifies behavior.

Nine additional recorded cases use trusted browser keys. With a Playwright page on the reference, the driver is:

```js
const inputs = await page.evaluate(() => window.keyboardReferenceCases);
const observed = [];
for (const input of inputs) {
  await page.evaluate((test) => window.mountKeyboardReference(test), input);
  await page.locator('#' + (input.focus ?? 'a')).focus();
  const states = [await page.evaluate(() => window.readKeyboardReference())];
  for (const key of input.keys) {
    await page.keyboard.press(key);
    states.push(await page.evaluate(() => window.readKeyboardReference()));
  }
  observed.push({ input, states });
}
await page.evaluate((result) => window.verifyKeyboardReference(result), observed);
await page.evaluate(() => window.clearKeyboardReference());
```

Native regression tests use modeled nodes/events and do not run native hardware. Fresh archive consumers check imports, refs, events, slots, augmentation and shared root/deep identity. See [validation](validation.md) and [issue #34](https://github.com/Altroo/mui-native/issues/34).

Native backend/schema bytes are unchanged. Physical touch/focus/keyboard/IME, nested windows, screen readers, visual glyph/spacing/RTL/font scaling, native stability and calibrated release performance remain open. These contracts do not establish complete Material compatibility or alpha readiness.
