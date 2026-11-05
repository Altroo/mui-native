# Native Portal

`Portal` renders native children in a different physical container within the same native window while retaining their original React context and event ancestry. It adds no modal window, focus request, keyboard dismissal or containing View to ThemeProvider. Web continues to resolve original MUI.

This is a pre-alpha native adaptation. Physical touch, hardware keyboard, input composition, screen-reader, visual clipping and performance gates remain open. Code generation, native compilation and JavaScript models do not establish those behaviors.

## Usage

```tsx
import React from 'react';
import { View, Text, type ViewInstance } from 'react-native';
import Portal, { type NativePortalHandle } from '@mui/material/Portal';

export function Example() {
  const container = React.useRef<ViewInstance>(null);
  const popup = React.useRef<NativePortalHandle>(null);
  return (
    <View>
      <View ref={container} collapsable={false} style={{ height: 200 }} />
      <Portal container={() => container.current} ref={popup} layer={1}>
        <Text>Portaled content</Text>
      </Portal>
    </View>
  );
}
```

Use the [native resolver](installation.md) for original imports, or import from `@altroo/mui-native/Portal` directly. Native host `0.0.4-dev.0` and an application rebuild are required. Expo Go does not include this library's custom native components.

Without `container`, or when a container callback returns `null`, Portal uses the current native window. A container callback resolves in a React layout effect. Its target ref must already be attached when that callback runs; a callback returning null uses the current window, matching the original fallback. Explicit containers must be mounted, non-collapsed ordinary native Views in the same window with nonempty bounds. ScrollView, foreign windows, circular targets and Views using `removeClippedSubviews` are unsupported. Use `collapsable={false}` on container Views.

Public React contexts, including theme and ButtonGroup defaults, retain their logical ancestry. Use library Box/Typography containers to carry inherited text through custom native components; raw React Native View/Text elements inside arbitrary external components keep React Native inheritance rules. Finite group descendant styles and inherited text instead follow the actual native destination. Owned text roots register their resolved scope without adding native hosts; native View/Text children preserve their element type and ref cleanup. Self/descendant and cyclic targets remain inactive until valid.

An explicit container retains its native transforms and ancestor clipping. Default window placement escapes the source ancestor's clipping. Layer order applies among Portal roots within the same physical container, with stable insertion order for equal layers. It does not reorder ordinary React siblings or cross native windows.

## Props and refs

- `children`, `container` and `disablePortal` follow the familiar MUI composition model. A changed resolved container remounts children; a new callback returning the same container preserves their state. Inline mode ignores the container callback and composes the child's native ref with the forwarded ref. Literal text is adapted through the native text scope.
- `layer` is a finite native-only number, default `0`, controlling sibling Portal order.
- `onContainerLayout` is a native-only callback receiving affine bounds, or `null` when presentation is unavailable. It reports layout and readiness changes, not an unmount notification.

Default Portal refs expose `NativePortalHandle`, replacing MUI's DOM container Element. The handle has `node` (the native canvas), `container` (the explicit native View, or `null` for the current window), `bounds`, `presented` and `measureInWindow(callback)`. Its measurement callback runs only while mounted and presented. Inline mode forwards a native View/Text/TextInput ref; it does not create a Portal handle. Native ref types deliberately reject DOM refs.

Bounds contain the container-local width and height, its window origin, and affine coefficients `a`, `b`, `c`, `d`. `measureInWindow` returns the enclosing window rectangle. Descendant native `.measure()` and `.measureInWindow()` use custom Fabric measurement boundaries calibrated to the actual native touch dispatcher; they do not use the old logical parent's offset.

## Native lifecycle and boundaries

The zero-sized logical host owns a full-sized native canvas. An attachment acknowledgement enables the canvas and library controls; stale revisions, malformed or singular transforms, inactive parent overlays, disconnected targets and covered modal ownership do not make content interactive. The default window root owns a touch/pointer dispatcher. Explicit View targets reuse their ancestor dispatcher to avoid duplicate events.

UIKit mounts into the pinned React Native content surface so styled container drawing and hit testing agree. Native root order controls both drawing and hit testing. Logical keyboard ancestry preserves the existing Tab/Escape contracts across physical redirection, including native input targets and composition guards. Broader editable-key navigation is unfinished.

Clipped-subview containers are rejected. If that prop is enabled after attachment, the root is hidden and removed through React Native's tracked-child bookkeeping after its traversal finishes. A pending-cleanup barrier prevents reparenting that root before removal. Android uses the View manager's public child methods; UIKit uses a guarded, source-pinned tracked-array adapter because Fabric has no public tracked-child getter. That coupling must be reviewed on React Native upgrades; the host peer is pinned to React Native 0.88.1.

Portal does not implement Popper placement, Autocomplete, focus trapping, scroll locking or a modal accessibility surface. Those require their own contracts and validation. There is no WebView or private JavaScript renderer portal dependency.

## Evidence

`tests/portal.test.tsx` exercises container timing, context identity, state/ref lifecycle, target revisions, readiness and modal ownership. `tests/portal-coordinates.test.ts` checks target-to-dispatch-root calibration and invalid geometry. `scripts/reference/portal.mjs` checks the pinned original MUI source and builds a Chromium reference; observed results are retained in `tests/fixtures/mui-portal-browser-9.5.0.json`. Installed-consumer checks cover original/direct imports, native refs, DOM rejection and retained native build sources.

`upstream/native-rendering.json`, the retained React Native license and `NOTICE` record the supporting native source. `scripts/native-rendering.test.mjs` checks the source/license fingerprints. This supporting record does not advance the MUI upstream support fields.
