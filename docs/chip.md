# Native Chip

Chip is a reusable display, action and removable-value component. Original root/deep imports resolve to native Chip; web continues using original MUI. Interactive chips require a development/production build containing the [native interaction host](native-host.md). Removable values are integrated with [native Autocomplete](autocomplete.md); its independent Chip release gates remain open.

```tsx
import Chip from '@mui/material/Chip';

<Chip label="Design" color="primary" variant="outlined" onClick={openCategory} />;
<Chip label="Berlin" onDelete={() => removeCity('Berlin')} />;
```

`onDelete` is a notification. The application owns removal from its collection. Chip does not delete itself. `clickable` controls presentation and keyboard semantics; `clickable={false}` preserves a supplied pointer `onClick`. Native `onPress` takes priority over `onClick` when both are supplied. Delete presses stop propagation and do not activate the outer chip. Genuine native gesture, key and accessibility-action payloads and methods reach callbacks, rather than browser mouse events or DOM targets.

Backspace/Delete notify on key up for the chip itself. Descendant, composing, canceled, disconnected, stale/unmounted, covered and not-yet-presented activation is guarded. Enter/Space activate clickable or deletable chip roots through ButtonBase. Rich label controls keep their own activation policy. Root-slot click/key callbacks run before the corresponding top-level callback. Deletion precedes top-level onKeyUp; Delete/Backspace defaults are prevented before top-level onKeyDown. As in the original, a key callback's default prevention does not cancel the onDelete notification. Applications decide whether to remove the value.

Disabled chips never activate or delete on native. This is an explicit difference from the recorded original behavior: a disabled, non-clickable deletable Chip can still publish deletion from the browser keyboard, and programmatic DOM icon dispatch bypasses pointer hit testing. Native disabled accessibility state remains true. Interactive disabled chips remain focusable by default; `skipFocusWhenDisabled` removes them from focus. Native `action.focusVisible()` is available for interactive roots and obeys current disabled/readiness/ownership guards.

## Layout and content

Static chips retain 32 dp medium and 24 dp small heights. Interactive chips and deletion targets default to at least 44 dp. These native touch layouts deliberately differ from the original compact browser geometry. Filled/outlined variants, theme colors, small/medium sizing and augmentation are supported. Caller styles can change the defaults; supply enough room for the chosen font size and content.

Primitive labels use one native Text line with tail ellipsis inside a shrinking View boundary. Rich labels keep native View boundaries and their own content structure. Avatar takes precedence over icon when both are provided, matching the original's rendering order. Decorative icon/avatar content is hidden from accessibility. Supply an explicit accessibilityLabel/aria-label when rich content cannot provide the desired accessible name.

The default delete indicator is an independently drawn native circular X, with 16/22 dp visual sizes and a 44 dp interaction target. It is not a second tab stop or accessible node. The chip exposes a native `delete` accessibility action; customize root accessibilityActions for localized labels and onAccessibilityAction for application behavior. Actual VoiceOver/TalkBack announcements remain unverified. Custom avatar/icon/deleteIcon elements must render native content. A custom deleteIcon is visual content; its own onClick/onPress is replaced by the chip's removal surface.

## Slots, styles and refs

The forwarded ref addresses the native root ViewInstance. `slotProps.root.ref` composes with it; `slotProps.label.ref` addresses the default label View. `slots.root` or `component` supplies an application-owned native interaction root and must forward native props, handlers and ref. `slots.label` supplies a native label component and receives ownerState, style, children and native props. Custom label components own their Text/View boundary and truncation. Root/label HTML tags and DOM refs are unsupported.

`slotProps.root` and `slotProps.label` accept owner-state callbacks. An own root-slot sx replaces top-level sx, including explicit undefined/null. Native top-level style follows resolved styles, and root-slot style follows top-level style. Root styles evaluate native state callbacks. Named root, size, color, clickable, deletable and variant overrides retain source order. Label/avatar/icon/deleteIcon named styles, supported state selectors, responsive sx and nullable theme callbacks are available. Literal native text settings and CSS-relative font/line-height semantics retain their separate units. Arbitrary CSS selectors and complete upstream inherited/DOM TypeMap APIs remain open.

Chip/chipClasses exposes original identifiers and getChipUtilityClass. classes/className identify source slots but do not create a native CSS engine. Size/color/variant and root/label slot override interfaces support module augmentation. Clean installed-consumer checks cover native custom-root required props, refs, callbacks, slots, augmentation and root/deep identity.

## Evidence

With the ignored original-package environment and React DOM artifact available, run `node scripts/reference/chip.mjs --check`, serve `.cache/chip-reference`, and call `window.verifyReference()` in Chromium at 390 by 844. Thirty actual original MUI 9.5.0 / React DOM 19.3.0 cases cover defaults, slot/root precedence, style tokens, typography, callback phases and class identifiers. Transitions are disabled; programmatic DOM click dispatch establishes callback paths, not native touch behavior.

Five additional cases use trusted browser keys. For each `window.chipKeyboardCases` entry, mount it with `window.mountChipReference(input)`, focus `#chip`, record `window.readChipReference()` before and after each Playwright `page.keyboard.press(key)`, and compare the resulting `{input, states}` array with `window.verifyChipKeyboardReference(results)`. Clear with `window.clearChipReference()`. Native modeled-event tests distinguish the documented disabled-deletion and touch-target adaptations.

[Issue #37](https://github.com/Altroo/mui-native/issues/37) tracks delivery; [validation](validation.md) records checks. Physical touch/focus/hardware input, screen readers, RTL/font scaling, nested windows, clipping/truncation geometry, native stability and measured release performance remain open. The original Chip increment did not operate a native session. Its removable-value integration now has scoped iOS/Android Autocomplete checks; the independent Chip native matrix and broader Material/X release gates remain unfinished.
