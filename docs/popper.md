# Native Popper

`Popper` is a reusable, nonmodal anchored surface. Import it from `@mui/material`, `@mui/material/Popper`, or the corresponding `@altroo/mui-native` paths. Web resolution continues to use original MUI. Native rendering requires native-host **0.0.5-dev.1** and an application rebuild; Expo Go cannot load this host.

```tsx
import { useState } from 'react';
import type { ViewInstance } from 'react-native';
import { Button, Paper, Popper, Typography } from '@mui/material';

export function DeliveryNote() {
  const [anchor, setAnchor] = useState<ViewInstance | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button ref={setAnchor} onClick={() => setOpen((value) => !value)}>
        Delivery details
      </Button>
      <Popper open={open} anchorEl={anchor} placement="bottom-start">
        <Paper sx={{ p: 2 }}>
          <Typography>Arrives Thursday, 14:00 to 16:00.</Typography>
        </Paper>
      </Popper>
    </>
  );
}
```

## Anchors, placement and lifecycle

`anchorEl` accepts an actual native View ref, a callback returning one, or a virtual element whose `getBoundingClientRect()` returns finite window-space bounds in device-independent units. Virtual bounds can use `x`/`y` or `left`/`top`; width and height must be nonnegative. Supply a native `contextElement` when a virtual anchor belongs to a scrolling/clipped native view. Untagged virtual anchors observe window and container changes; after changing the virtual rectangle yourself, call the instance's `update()`.

All fifteen placement names are supported. RTL flips the start/end variation of top/bottom placements, following the original wrapper. `popperOptions.placement` overrides that default. Flip, offset, overflow/tether, arrow and hide calculations use the native snapshot adapter and the [positioning engine](native-positioning.md).

`open`, `keepMounted`, function children, and `transition` follow the source-backed composition contract. With transitions, render the child using `TransitionProps.in` and call its `onEnter` and `onExited` callbacks through the transition component, for example `<Grow {...TransitionProps}>`. The engine remains active through exit and stops after `onExited`. `keepMounted` retains child state while closed. Popper supplies no default animation, focus trap, editor focus request or automatic click-away close handler.

Until the current popup, anchor/context and required explicit boundaries have usable native geometry, the popup is invisible, noninteractive and hidden from accessibility. Losing an anchor or boundary hides an already positioned popup immediately, even when the event-listener modifier is disabled. Valid later geometry can recover through an update. Closing, retargeting, covered parent overlays and cleanup invalidate old observations.

## Portal and inline rendering

The default [Portal](portal.md) attaches within the existing native window or the supplied native `container`. It preserves React context. It does not create a modal or WebView. `disablePortal` keeps the popup inline; `container` is then ignored. A noncollapsible, zero-border/padding absolute surface gives the inline popup a stable native containing block. Inline content still inherits physical ancestor clipping and transforms.

Android pre-draw tracking and UIKit display-link tracking publish changed geometry while active, with replaceable events coalesced on each platform. The adapter keeps one immutable native frame per modifier cycle and rejects retired frames. No JavaScript frame-polling loop is added. A native event is classified as resize when tracked sizes or containing-frame scale/rotation change, otherwise as movement; the `eventListeners` modifier's resize/scroll options control automatic recomputation. Explicit instance updates remain available.

Native `strategy: 'absolute'` and `'fixed'` both render using the native containing block and window adapter. They are not browser CSS positioning modes. Measurements include full window and usable viewport bounds, system/IME/safe-area clipping, separate reference/popup clipping parents, and explicit native boundary padding boxes. Signed disjoint intersections and empty clips are retained. Affine coordinates are mapped before taking bounding rectangles; clipping is still rectangular, not an exact rotated or rounded polygon intersection. Ordinary uniform native scaling, planar rotation and their combination are supported. Unknown masks and singular/perspective/tilted transforms are not certified geometry.

## Slots, styles and instance refs

- `slots.root` and `slotProps.root` replace/configure the native root. Slot callbacks receive owner state. Forward the actual native View ref and layout/style/interaction props in custom roots. The default root has role `tooltip` and is not focusable.
- Theme defaults, `MuiPopper` root styles, `sx`, `style`, root-slot styles and utility class identifiers compose within the library's documented native styling subset. `popperClasses` and `getPopperUtilityClass` also have `Popper/popperClasses` imports. Class identifiers do not implement arbitrary browser CSS selectors.
- The forwarded root ref is a native View instance. `popperRef` receives `NativePopperInstance`, exposing `state`, `update()`, `forceUpdate()`, `setOptions()` and `destroy()`. Use the native types exported beside Popper. Browser element refs and structurally DOM-like virtual nodes are rejected.
- `modifiers` and `popperOptions.modifiers` merge by name in source order. Custom modifiers receive native elements/styles/geometry. DOM-querying modifiers require a native implementation. The engine validates options and bounded resets instead of silently accepting unsupported selectors or invalid geometry.
- The arrow modifier accepts an actual descendant native View, not a selector string. Give its outer View a measured size and render any rotated glyph inside it. The engine owns that outer View's positioning styles and clears them on axis changes or teardown. Custom `applyStyles` modifiers own their own publication policy.
- As in the verified MUI wrapper, `component` replaces the entire default Popper implementation. Use `slots.root` to replace only the rendered root while retaining positioning/lifecycle. Native custom components retain their declared required props; browser intrinsic strings are unsupported.

## Verification and limits

The pinned original Material 9.5.0 wrapper has nineteen Chromium composition observations covering root/instance refs, slots, defaults, container routing, RTL, visibility and transitions. The internal engine has 88 original Core geometry comparisons. Regression tests exercise the actual React composition with modeled native refs/events and the measured-frame adapter; clean installed archives verify original/root/deep imports, augmentation, native types, source retention and web isolation. `scripts/reference/popper-component.mjs --check` verifies the pinned source/fixture and builds the browser probe; executing `window.verifyReference()` in that probe is the separate browser comparison.

The catalog's Overlays section exercises window/inline rendering, a scrolling trigger, transformed and explicit boundary frames, an arrow, placement changes and an interactive child. The [native catalog checks](native-catalog-testing.md) verify both-platform emulator scrolling/recovery and repeated reopen/close behavior; their geometry, accessibility and screenshot evidence have distinct limits. Compile/link checks and model tests do not establish physical touch, hardware keyboard/IME, screen-reader behavior, all clipping/transform combinations, stability or calibrated release performance on both platforms. Those release gates remain open. Full Autocomplete and wider Material/X coverage remain unfinished. See [validation](validation.md) and [issue #39](https://github.com/Altroo/mui-native/issues/39) for the actual evidence and delivery commits.
