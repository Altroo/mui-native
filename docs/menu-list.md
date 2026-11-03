# Native MenuItem and MenuList

MenuItem and MenuList are exported from the material root and original deep import paths. The optional native resolver maps eligible `@mui/material` imports to the same implementations. They require a native development/production build containing the [interaction host](native-host.md). This is an adapted subset of the pinned MUI 9.5.0 contracts. Anchored Menu and Select integration remain subsequent work.

```tsx
import React from 'react';
import { MenuList, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import type { MenuListActions } from '@mui/material/MenuList';

const actions = React.createRef<MenuListActions>();
<MenuList actions={actions} autoFocusItem scrollable sx={{ maxHeight: 320 }}>
  <MenuItem selected onClick={openAccount}>
    <ListItemText primary="Operating account" secondary="Updated today" />
  </MenuItem>
  <MenuItem disabled>Temporarily unavailable</MenuItem>
  <MenuItem role="menuitemcheckbox" aria-checked={notifications} onClick={toggleNotifications}>
    Notifications
  </MenuItem>
</MenuList>;
```

## Registration and keyboard

Items register their actual connected native refs, stable identities, selected/disabled/focus metadata and text. Native `compareDocumentPosition` determines traversal after keyed reordering, including wrapped items. Removed or disconnected nodes do not remain traversal targets; attachment tokens protect a replacement from stale ref cleanup. MenuItem requires an owning MenuList, as in the pinned source. A nested MenuList owns an independent registry.

The default `variant="selectedMenu"` initially favors the first eligible selected item; `variant="menu"` favors the first eligible item. The list root defaults to native `role="menu"` and `tabIndex={-1}`. The selected-menu active item participates in native traversal; menu-variant items use explicit focus. `autoFocus` targets the root and `autoFocusItem` targets the eligible item, with root fallback when both are enabled and no item is available. A late connected item can complete the pending item handoff.

ArrowDown/ArrowUp, Home/End, optional wrapping, `disableListWrap` and `disabledItemsFocusable` are implemented. Typeahead uses rendered native `textContent`, trimmed and lowercased, with a 500 ms inactivity reset, repeated-character cycling, cumulative prefixes and the pinned failed-prefix latch. Typeahead wraps even when arrow wrapping is disabled. Set `textValue` for complex labels whose searchable text differs from rendered content. This is a native extension.

Disabled items can receive programmatic menu focus when enabled by the list policy, remain excluded from ordinary tab traversal, and cannot activate. Native ButtonBase lets the owning menu handle navigation without suppressing those keys on a focused disabled item. Enter/Space activation, pointer press, native event adapters and callback cancellation compose with [ButtonBase](button-base.md). Composition/canceled key events remain external and do not navigate. Modified arrows do not navigate. Browser KeyboardEvent types, document globals and browser form submission are not native contracts.

The root declares its navigation keys to the native host before dispatch. Additional `managedKeys` can be supplied for a composing native overlay. JavaScript prevention alone cannot cancel a native default for undeclared keys. Events expose actual native targets; child focus handlers run before the root bubble callback.

## Focus, layout and custom roots

`actions` is a native public extension exposing `focusInitialTarget()` and `adjustStyleForScrollbar()`. The focus action preserves an observed connected descendant, including a custom input in a subheader. Standard TextInput focus/blur and private host events share target tracking without duplicate root callbacks. Blur from an old target does not clear newer focus. Native scroll indicators overlay content, so scrollbar compensation is a no-op returning the actual root.

`focusSource="keyboard"` requests focus indication; `"pointer"` suppresses the initial indication. Without an explicit source, the pinned menu-variant selected-item handoff suppression applies. The native implementation deliberately restores indication on the next keyboard move even where the pinned original controlled-host trace keeps it suppressed. This difference is explicit in the reference fixture.

List density, native text inheritance, gutters, divider, selected/hover/focus/disabled styles and applicable theme defaults compose with the item. Regular items have a 48 dp native minimum; explicit dense mode uses the pinned 32 dp minimum and body2 text. Rows can grow for content. Applications choosing compact density own suitable touch geometry. Menu ListItemIcon reserves 36 dp and dense menu icons use 20 dp. Icons inherit supported native text colors, `fontSize="inherit"` and the shared icon style scope; explicit SVG dimensions retain precedence. Menu ListItemText removes ordinary row margins and uses the 36 dp menu inset.

Default MenuList uses an InteractiveView as the actual focus/viewport root. `scrollable` adds one inner ScrollView for owned scrolling and direct sticky subheaders. Viewport/content styles follow [List](lists.md). The outer root owns menu role, tab index and keyboard events; `scrollViewProps` cannot erase those semantics or make the inner scroll viewport a second traversal target. Nested content remains focusable. Scroll props still configure the inner scroll view, with `accessible=false`, `focusable=false` and `tabIndex=-1` reserved there.

For `component`, wrap and forward `MenuListRoot` from the MenuList deep import, including all received props and the native ref:

```tsx
import { type ViewInstance } from 'react-native';
import { MenuListRoot, type MenuListRootProps } from '@mui/material/MenuList';
const Root = React.forwardRef<ViewInstance, MenuListRootProps>((props, ref) => (
  <MenuListRoot {...props} ref={ref} />
));
<MenuList component={Root}>...</MenuList>;
```

The helper forwards native focus/keyboard channels and scrolling carriers. Arbitrary custom roots must retain these contracts and public connected-node methods. A stock native View is not an equivalent focus host. Focus tracking relies on observed events; an application that stops propagation owns that interruption. Native MenuList does not read browser `document.activeElement`.

## Evidence and remaining gates

Eighteen original pinned MenuList/MenuItem runtime traces execute against controlled connected DOM nodes, focus, clock and keyboard propagation. Native regressions use actual native mock refs augmented with an explicit public-node model. These tests cover registration, ordering, initial focus, disabled policy, keyboard/typeahead, activation and native adaptations. They do not constitute device evidence. See [validation](validation.md) and [issue #28](https://github.com/Altroo/mui-native/issues/28).

Physical hardware-key behavior, focus-engine traversal, scroll-to-focused visibility, touch/ripple, screen-reader announcements, RTL/font scaling, IME/layout-specific keyboards, nested overlays and release performance remain open on both platforms. Browser CSS selectors/classes, arbitrary DOM roots, complete generic/helper types and browser scroll locking are not established. Native Menu, Select, complete SvgIcon/icon coverage and overall alpha support remain unfinished. No upstream baseline or released-support status is advanced by this increment.
