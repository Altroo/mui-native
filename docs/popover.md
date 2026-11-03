# Native Popover

Popover is available from @mui/material/Popover and the root @mui/material import through the native resolver. It uses the reusable native Modal, Paper and Grow components. [Menu](menu.md) adds registered list focus and dismissal; [Select](select.md) composes Menu for selection.

```tsx
import React from 'react';
import { View, type ViewInstance } from 'react-native';
import { Button, Typography } from '@mui/material';
import Popover, { type PopoverActions } from '@mui/material/Popover';

function Help() {
  const anchor = React.useRef<ViewInstance>(null);
  const action = React.useRef<PopoverActions>(null);
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <View ref={anchor} collapsable={false}>
        <Button onClick={() => setOpen(true)}>Details</Button>
      </View>
      <Popover
        open={open}
        anchorEl={() => anchor.current}
        action={action}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 2 } } }}
      >
        <Typography>Additional information</Typography>
      </Popover>
    </>
  );
}
```

## Positioning

anchorEl accepts a native View instance, a function returning one, or a virtual element with nodeType=1 and getBoundingClientRect returning finite top/left/width/height. Virtual rectangles and anchorPosition use native window coordinates in logical pixels. Native anchors use measureInWindow. A missing anchor falls back to the window rectangle. A disconnected or invalid anchor is diagnosed.

anchorReference selects anchorEl, anchorPosition or none. Anchor and transform origins accept the pinned edge/center strings or numbers. Positioning reads the paper's untransformed offsetWidth/offsetHeight, applies window margins, adjusts transform origin and rounds top/left following Material UI 9.5.0. The pinned marginThreshold=null quirk is retained: vertical constraints are disabled but right overflow still shifts horizontally. none leaves authored paper top/left untouched and updates its transform origin.

The root is measured separately; its window origin is subtracted before applying paper coordinates. This supports an offset inline disablePortal root. Custom roots and papers must forward native refs, styles and layout callbacks. Custom handles without the public offset getters can supply paper dimensions through onLayout. Both root and paper must have layout before the default transition starts. Until then the paper is transparent, ignores touches and is hidden from accessibility. Closing before measurement still releases the overlay.

The coordinate root reserves direction=ltr so native RTL left/right swapping cannot mirror physical anchor coordinates. The default paper restores content direction from the resolved MuiPopover root overrides, root sx/inline styles, nested Modal root slot styles, or theme.direction; its own overrides/styles can change content direction. A custom root must forward the final coordinate style to the containing native view, and a custom paper must preserve the content direction it needs. Hidden direction-bearing wrappers and arbitrary native ancestors are custom slot responsibilities. Physical RTL behavior still needs device evidence.

Layout/content-size changes, native window resize, root show, render commits and action.current.updatePosition() request fresh placement. The action ref is null while closed. Results from superseded requests, closed cycles, unmounted nodes and replaced surfaces are ignored. Scrolling an external anchor does not automatically subscribe to that scroll view; call updatePosition from the application's scroll/layout handler when necessary.

## Slots, styles and motion

The root, paper, transition and backdrop slots accept native components and owner-state callbacks. PopoverRoot and PopoverPaper are public composition helpers. getOffsetTop/getOffsetLeft are also available from root/deep imports. MuiPopover default props and scoped root/paper overrides apply. Slot root props override ordinary top-level root props; root styles merge. Explicit/default disableAutoFocus remains owned by Popover. Paper slot elevation overrides the default elevation=8.

The default invisible backdrop and Modal keep dismissal controlled through onClose(event, reason). Native focus and dismissal behavior follow [Modal](modals.md). Native body scroll locking, browser container portals, browser classes and DOM refs are not implemented. JavaScript browser-only inputs receive diagnostics where handled; public native types omit those contracts.

Grow defaults to automatic height timing. A replacement transition receives an undefined timeout for auto unless it advertises muiSupportAuto. Explicit transitionDuration wins over slotProps.transition.timeout. Transition slot in/appear overrides remain effective. Entering/exited handlers compose with positioning cleanup, and the internal paper layout recorder remains active even when a transition supplies onLayout. The private readiness coordination supports the library's Fade/Grow; a custom transition owns its own animation and must forward its child ref/style/layout and lifecycle callbacks.

The default paper has minimum dimensions of 16 and maximum window dimensions minus 32, with native vertical scrolling and handled keyboard taps. Literal content uses the shared native text scope. Native shadow/clipping, scroll nesting, keyboard insets, focus, safe areas, transformed/custom roots and multiwindow geometry require actual platform validation. No device screenshots, screen-reader result or measured release performance are established by mocked tests.

## Reproduce

After the [isolated reference setup](theming.md), including react-test-renderer@19.3.0 in that ignored cache, run node scripts/reference/popover.mjs --check. It verifies immutable tarball/source/license bytes before executing fourteen original Popover cases with controlled DOM geometry. Native tests compare geometry and public helpers and exercise real Modal/Grow composition with mocked native measurements, delayed/out-of-order callbacks, close/reopen, surface replacement, resize, slots, fallback layout and dismissal. Fresh packed-consumer checks cover root/deep imports, native refs/action, virtual anchors, slots and browser-prop rejection. These are scoped contract checks; complete upstream package support and alpha gates remain open.
