# Native anchored Menu

Menu composes native [Popover](popover.md), Modal/Grow and the registered [MenuList/MenuItem](menu-list.md) primitives. Original root/deep Menu imports, MenuPaper, the three slot class identifiers and getMenuUtilityClass are exported. This is an adapted MUI 9.5.0 subset with a native interaction host; use a development/production build, not Expo Go. Select integration remains subsequent work.

```tsx
import React from 'react';
import { type ViewInstance } from 'react-native';
import { ButtonBase, Menu, MenuItem, ListItemText } from '@mui/material';

export function AccountMenu() {
  const [open, setOpen] = React.useState(false);
  const trigger = React.useRef<ViewInstance>(null);
  return (
    <>
      <ButtonBase ref={trigger} onClick={() => setOpen(true)}>
        Account actions
      </ButtonBase>
      <Menu open={open} anchorEl={() => trigger.current} onClose={() => setOpen(false)}>
        <MenuItem onClick={() => setOpen(false)}>
          <ListItemText primary="View account" />
        </MenuItem>
        <MenuItem disabled>Archive unavailable</MenuItem>
      </Menu>
    </>
  );
}
```

## Focus and dismissal

Menu defaults to autoFocus=true and variant=selectedMenu, favoring the first eligible selected item. variant=menu starts from the first eligible item. disableAutoFocusItem targets the list instead. Empty/all-disabled lists retain the list fallback. Menu disables Popover's initial autofocus when it owns focus; explicit inherited disableAutoFocus can override that default, matching the pinned routing.

Item focus waits for usable Popover geometry and a presented, top-owned native overlay. A closed keepMounted menu cannot steal focus, including explicit list/item autofocus requests. Android completed closes reset presentation readiness without relying on the iOS-only onDismiss callback. Interrupted exits retain the already presented window. The entering lifecycle performs native scrollbar adjustment (a no-op), then initial focus, then the external transition callback. Focus already inside the list is preserved.

Tab and Shift+Tab prevent native traversal and request onClose(event, 'tabKeyDown') before the list's external key handler, including an already-prevented Tab. Composing/canceled events do not request closure through the bridged key-down handlers. Escape from interaction-host and declared foreign-control targets, native back/accessibility requests and backdrop presses use the inherited Modal reasons escapeKeyDown/backdropClick. Back/accessibility requests may have a null event. This is controlled behavior: callbacks do not change open. Top-layer/inactive guards apply. Native Tab and Escape ownership is declared before dispatch. Android window-hosted Escape dismissal uses the native window request-close route on key-up, including inline descendants, to avoid duplicate requests. Inline children inherit their owning window's presentation readiness. The declared descendant bridge emits from the actual React control, preserving its capture/bubble callbacks and target before Menu handles Tab. A child can stop the bubbling close handler. Android's separate native window request-close remains independent of that JavaScript propagation; its Escape key-up handler also does not inspect composition or cancellation. UIKit command events provide no physical key-up or repeat metadata; see the [native host contract](native-host.md#keys-from-native-descendants).

Native focus tracking observes actual private-host and standard TextInput focus events. A button trigger rendered through the host can be restored automatically. returnFocusRef remains an explicit override; TextInput.State supplies a fallback for inputs outside observed hosts. Same-node callback-ref replacement retains observed focus; blur/disconnection releases it. No document.activeElement, optimistic focus-request tracking or global React Native feature-flag override is used. Default Modal/Popover roots now use the explicit native host. Without an explicit initialFocusRef or an observed in-overlay target, generic Modal/Dialog autofocus falls back to that root rather than a stock child View whose focus may be gated off.

Nested lists keep independent registries. Only the innermost MenuList performs navigation/typeahead for a bubbling native key; ancestor callbacks still run. The event is persisted before private ownership tagging because React Native SyntheticEvents can be pooled. A WeakSet does not retain events strongly. Nested Menu close restores the eligible parent target through the native overlay manager.

## Positioning, styling and slots

Default attachment is bottom-left with a top-left transform origin in LTR, and bottom-right/top-right in RTL. The RtlProvider scope selects these defaults. Explicit anchorOrigin/transformOrigin win. Native anchors, virtual anchors, window-coordinate conversion, margins and action.updatePosition follow Popover. MenuPaper reserves 96 dp of window height for outside dismissal space, stays vertically scrollable and grows with content. Native dimensions and fonts do not establish identical browser geometry or safe-area/keyboard-inset behavior.

The root, paper, list, transition and backdrop slots accept native components and object/owner-state slotProps. MuiMenu defaults and root overrides/variants apply; default MenuPaper and list surfaces apply their named overrides. Slot styles/sx and native refs compose with the underlying Paper/List/Popover defaults. List slot focus/variant props can override the supplied policy, while closed/unpresented/covered gates still prevent native focus. Transition callbacks run after internal entering work. Custom transitions retain the inherited automatic-duration support marker contract.

```tsx
import { PopoverRoot, MenuList } from '@mui/material';
import {
  MenuPaper,
  type MenuRootProps,
  type MenuPaperProps,
  type MenuListSlotProps,
} from '@mui/material/Menu';

const Root = React.forwardRef<ViewInstance, MenuRootProps>((props, ref) => (
  <PopoverRoot {...props} ref={ref} />
));
const Paper = React.forwardRef<ViewInstance, MenuPaperProps>((props, ref) => (
  <MenuPaper {...props} ref={ref} />
));
const List = React.forwardRef<ViewInstance, MenuListSlotProps>(({ ownerState, ...props }, ref) => (
  <MenuList {...props} ref={ref} />
));
```

Custom roots must forward native refs, final coordinate styles, lifecycle, managedDescendantKeys and private/standard focus/key channels. Composing PopoverRoot preserves the default native Modal readiness and stack integration. Custom roots that bypass it own those contracts. Custom lists should compose MenuList, retain its actions ref and forward events; custom papers should retain layout/measurement and scroll behavior. Slot override interfaces are augmentable through the Menu deep import. MenuPaper and class helpers also support original deep imports; helpers provide identifiers only. Browser classes/className/CSS styling and ClassNameGenerator customization are not implemented natively.

## Evidence and remaining gates

Seventeen actual original Menu/Popover runtime cases reproduce focus flags, closed retention, LTR/RTL geometry, inherited overrides, slot callbacks, transition order, Tab semantics and root close precedence. Standalone original MenuPaper rendering verifies its height reservation and helper outputs. Original Material/Utils/System artifact, source and license bytes are checked first. Native tests additionally cover actual component composition with explicit native-node/event models, window readiness, Android reopen, interrupted exits, trigger restoration, stale keys, nested ownership and same-node ref changes. See [validation](validation.md) and [issue #29](https://github.com/Altroo/mui-native/issues/29).

These are contract/configuration tests. The declared native descendant Tab/Escape bridge now has both-platform codegen, compile/link and explicit JavaScript event-path evidence, including raw TextInput target identity, child propagation, capture ordering, composition/cancellation guards and stale-owner removal. It requires a native rebuild. Physical iOS/Android hardware delivery and focus-engine behavior, full Tab trapping, scroll-to-focused visibility, nested window/portal behavior, safe areas, keyboard avoidance, screen-reader announcements, RTL/font scaling, touch stability and measured release performance remain open. UIKit command delivery does not provide physical key-up/repeat metadata. Android window back/Escape uses the separate native request-close route. These limits remain tracked beyond the scoped Menu implementation in issue #29. Browser body scroll locking, arbitrary CSS/DOM refs/events, full inherited/generic contracts, Select and complete Material/X coverage remain unfinished. No whole-package verified support, npm publication or paid feature parity follows from this increment.
